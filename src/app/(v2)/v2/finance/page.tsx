'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { format, getDaysInMonth, startOfMonth, getDay, parseISO, isSameDay, isToday } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, X, Search,
  TrendingUp, TrendingDown, Wallet,
  UtensilsCrossed, Landmark, LineChart, Home, Bike, ShoppingBag, MoreHorizontal,
} from 'lucide-react'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { useLocalStorage, nanoid } from '@/lib/v2/storage'
import { SEED_TRANSACTIONS } from '@/lib/v2/seed'
import type { Transaction, TransactionCategory } from '@/lib/v2/types'

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<TransactionCategory, { label: string; color: string; Icon: React.ElementType }> = {
  salary:    { label: 'Salary',     color: '#3a5fa0', Icon: Landmark },
  food:      { label: 'Food',       color: '#c89040', Icon: UtensilsCrossed },
  bills:     { label: 'Bills',      color: '#7040a0', Icon: Home },
  invest:    { label: 'Investment', color: '#3a5fa0', Icon: LineChart },
  transport: { label: 'Transport',  color: '#aaaaaa', Icon: Bike },
  shopping:  { label: 'Shopping',   color: '#b05040', Icon: ShoppingBag },
  other:     { label: 'Other',      color: '#888888', Icon: MoreHorizontal },
}

const HEATMAP_COLORS = ['#f0eeea', '#e8d4c0', '#d8b090', '#c07050', '#a04030']

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.abs(n).toLocaleString('vi-VN') + '₫'
}

function getHeatLevel(amount: number, max: number): number {
  if (amount === 0 || max === 0) return 0
  const ratio = amount / max
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, amount, sub, trend, accent }: {
  label: string; amount: number; sub: string; trend?: number; accent: string
}) {
  return (
    <div className="bg-white rounded-[14px] p-4 flex-1" style={{ border: '1px solid #e8e6e1' }}>
      <div className="text-[11px] mb-1" style={{ color: '#999' }}>{label}</div>
      <div className="text-[22px] font-medium" style={{ color: accent }}>{fmt(amount)}</div>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[11px]" style={{ color: '#999' }}>{sub}</span>
        {trend !== undefined && (
          <span className="text-[11px]" style={{ color: trend >= 0 ? '#4a7c3f' : '#b05040' }}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}

function SpendingHeatmap({ transactions, year, month, onDayClick }: {
  transactions: Transaction[]
  year: number; month: number
  onDayClick: (day: number) => void
}) {
  const daysInMonth = getDaysInMonth(new Date(year, month))
  const firstDow = getDay(startOfMonth(new Date(year, month)))
  const offset = firstDow === 0 ? 6 : firstDow - 1

  const spendByDay: Record<number, number> = {}
  transactions.forEach((t) => {
    const d = parseISO(t.date)
    if (d.getFullYear() === year && d.getMonth() === month && t.amount < 0) {
      const day = d.getDate()
      spendByDay[day] = (spendByDay[day] || 0) + Math.abs(t.amount)
    }
  })
  const maxSpend = Math.max(...Object.values(spendByDay), 1)

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div className="bg-white rounded-[14px] p-4" style={{ border: '1px solid #e8e6e1' }}>
      <div className="text-[13px] font-medium mb-3" style={{ color: '#1a1a1a' }}>Spending Heatmap</div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-[10px]" style={{ color: '#bbb' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const spend = spendByDay[day] || 0
          const level = getHeatLevel(spend, maxSpend)
          const isToday2 = isCurrentMonth && today.getDate() === day
          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              title={spend ? `${fmt(spend)}` : undefined}
              className="aspect-square rounded flex items-center justify-center text-[10px] transition-all hover:opacity-80"
              style={{
                backgroundColor: HEATMAP_COLORS[level],
                color: level >= 3 ? '#fff' : '#555',
                outline: isToday2 ? '2px solid #1a1a1a' : 'none',
                outlineOffset: '-2px',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px]" style={{ color: '#bbb' }}>Low</span>
        {HEATMAP_COLORS.map((c, i) => (
          <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px]" style={{ color: '#bbb' }}>High</span>
      </div>
    </div>
  )
}

const CAT_PAGE_SIZE = 3

function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const [page, setPage] = useState(0)

  const expenses = transactions.filter((t) => t.amount < 0)
  const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)

  const byCategory: Record<string, number> = {}
  expenses.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount)
  })

  const sorted = Object.entries(byCategory)
    .map(([cat, amount]) => ({ cat: cat as TransactionCategory, amount, pct: total ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)

  const totalPages = Math.ceil(sorted.length / CAT_PAGE_SIZE)
  const paginated = sorted.slice(page * CAT_PAGE_SIZE, page * CAT_PAGE_SIZE + CAT_PAGE_SIZE)

  // reset to page 0 when data changes
  useEffect(() => { setPage(0) }, [transactions.length])

  return (
    <div className="bg-white rounded-[14px] p-4 flex flex-col" style={{ border: '1px solid #e8e6e1' }}>
      <div className="text-[13px] font-medium mb-3" style={{ color: '#1a1a1a' }}>Expense by Category</div>

      {/* fixed-height list area so pagination never moves */}
      <div className="flex flex-col flex-1" style={{ minHeight: CAT_PAGE_SIZE * 40 }}>
        <div className="flex flex-col gap-2.5 flex-1">
          {paginated.map(({ cat, amount, pct }) => {
            const meta = CATEGORY_META[cat]
            return (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                <span className="text-[12px] w-20 shrink-0" style={{ color: '#555' }}>{meta.label}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#f0eeea' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                </div>
                <span className="text-[12px] font-medium w-24 text-right shrink-0" style={{ color: '#1a1a1a' }}>{fmt(amount)}</span>
                <span className="text-[11px] w-8 text-right shrink-0" style={{ color: '#bbb' }}>{pct}%</span>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <div className="text-[12px] text-center py-4" style={{ color: '#bbb' }}>No expenses this period</div>
          )}
        </div>

        {/* pagination pinned at bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid #f0eeea' }}>
            <span className="text-[11px]" style={{ color: '#bbb' }}>
              {page * CAT_PAGE_SIZE + 1}–{Math.min((page + 1) * CAT_PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-6 h-6 flex items-center justify-center rounded-[6px] disabled:opacity-30 hover:bg-[#f0eeea]"
              >
                <ChevronLeft size={12} color="#555" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[11px] font-medium transition-colors"
                  style={{ backgroundColor: page === i ? '#1a1a1a' : 'transparent', color: page === i ? '#fff' : '#555' }}>
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="w-6 h-6 flex items-center justify-center rounded-[6px] disabled:opacity-30 hover:bg-[#f0eeea]"
              >
                <ChevronRight size={12} color="#555" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const LOG_PAGE_SIZE = 5

function TransactionLog({ transactions, highlightDay }: {
  transactions: Transaction[]
  highlightDay: number | null
}) {
  const [page, setPage] = useState(0)

  const grouped: Record<string, Transaction[]> = {}
  transactions.forEach((t) => {
    grouped[t.date] = grouped[t.date] || []
    grouped[t.date].push(t)
  })
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const totalPages = Math.ceil(sortedDays.length / LOG_PAGE_SIZE)
  const pageDays = sortedDays.slice(page * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE + LOG_PAGE_SIZE)

  // when heatmap highlights a day, jump to the page that contains it
  useEffect(() => {
    if (!highlightDay) return
    const idx = sortedDays.findIndex((d) => parseISO(d).getDate() === highlightDay)
    if (idx >= 0) setPage(Math.floor(idx / LOG_PAGE_SIZE))
  }, [highlightDay]) // eslint-disable-line react-hooks/exhaustive-deps

  // reset page when filter changes
  useEffect(() => { setPage(0) }, [transactions.length])

  return (
    <div className="flex flex-col" style={{ minHeight: LOG_PAGE_SIZE * 110 }}>
      <div className="flex flex-col gap-3 flex-1">
      {pageDays.map((dateStr) => {
        const dayTxns = grouped[dateStr]
        const net = dayTxns.reduce((s, t) => s + t.amount, 0)
        const d = parseISO(dateStr)
        const dayNum = d.getDate()
        const isHighlighted = highlightDay === dayNum
        return (
          <div
            key={dateStr}
            className="rounded-[14px] overflow-hidden transition-all"
            style={{
              border: isHighlighted ? '2px solid #a07030' : '1px solid #e8e6e1',
              backgroundColor: '#fff',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid #f0eeea' }}
            >
              <span className="text-[12px] font-medium" style={{ color: '#555' }}>
                {format(d, 'EEEE, d MMM', { locale: vi })}
              </span>
              <span className="text-[12px] font-medium" style={{ color: net >= 0 ? '#4a7c3f' : '#b05040' }}>
                {net >= 0 ? '+' : ''}{fmt(net)}
              </span>
            </div>
            {dayTxns.map((t) => {
              const meta = CATEGORY_META[t.category]
              const Icon = meta.Icon
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid #f7f6f3' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.color + '18' }}>
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: '#1a1a1a' }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: '#bbb' }}>{meta.label}</div>
                  </div>
                  <span className="text-[13px] font-medium shrink-0" style={{ color: t.amount >= 0 ? '#4a7c3f' : '#b05040' }}>
                    {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}

      {sortedDays.length === 0 && (
        <div className="text-center py-12 text-[13px]" style={{ color: '#bbb' }}>No transactions</div>
      )}
      </div>

      {/* Pagination pinned at bottom — doesn't move between pages */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid #f0eeea' }}>
          <span className="text-[11px]" style={{ color: '#bbb' }}>
            {page * LOG_PAGE_SIZE + 1}–{Math.min((page + 1) * LOG_PAGE_SIZE, sortedDays.length)} of {sortedDays.length} days
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] disabled:opacity-30 hover:bg-[#f0eeea]"
            >
              <ChevronLeft size={13} color="#555" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: page === i ? '#1a1a1a' : 'transparent',
                  color: page === i ? '#fff' : '#555',
                }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] disabled:opacity-30 hover:bg-[#f0eeea]"
            >
              <ChevronRight size={13} color="#555" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MonthPicker({ year, month, onChange }: {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}) {
  const [pickerYear, setPickerYear] = useState(year)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setPickerYear(year) }, [year, open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = (m: number) => {
    onChange(pickerYear, m)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        onClick={() => {
          const d = new Date(year, month - 1)
          d.setMonth(d.getMonth() - 1)
          onChange(d.getFullYear(), d.getMonth())
        }}
        className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
      >
        <ChevronLeft size={14} color="#555" />
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className="h-[30px] px-3 rounded-[7px] text-[13px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[#f0eeea]"
        style={{ color: '#1a1a1a', border: open ? '1px solid #e8e6e1' : '1px solid transparent', minWidth: 130 }}
      >
        {format(new Date(year, month), 'MMMM yyyy', { locale: vi })}
        <ChevronDown size={12} color="#bbb" />
      </button>

      <button
        onClick={() => {
          const d = new Date(year, month + 1)
          onChange(d.getFullYear(), d.getMonth())
        }}
        className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
      >
        <ChevronRight size={14} color="#555" />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 z-50 bg-white rounded-[14px] p-3 shadow-lg"
          style={{ border: '1px solid #e8e6e1', width: 220 }}
        >
          {/* Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
            >
              <ChevronLeft size={13} color="#555" />
            </button>
            <span className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{pickerYear}</span>
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
            >
              <ChevronRight size={13} color="#555" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTH_LABELS.map((label, i) => {
              const isSelected = pickerYear === year && i === month
              const isCurrentMonth = pickerYear === new Date().getFullYear() && i === new Date().getMonth()
              return (
                <button
                  key={i}
                  onClick={() => select(i)}
                  className="h-[34px] rounded-[7px] text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: isSelected ? '#1a1a1a' : isCurrentMonth ? '#f0eeea' : 'transparent',
                    color: isSelected ? '#fff' : isCurrentMonth ? '#a07030' : '#555',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Transaction) => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [isExpense, setIsExpense] = useState(true)
  const [category, setCategory] = useState<TransactionCategory>('food')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !amount) return
    const num = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(num)) return
    onAdd({
      id: nanoid(),
      name,
      amount: isExpense ? -Math.abs(num) : Math.abs(num),
      category,
      date,
      note: note || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div className="bg-white rounded-[14px] w-[420px] shadow-xl" style={{ border: '1px solid #e8e6e1' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0eeea' }}>
          <span className="text-[14px] font-medium" style={{ color: '#1a1a1a' }}>Add Transaction</span>
          <button onClick={onClose}><X size={16} color="#999" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Transaction name"
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Amount (₫)</label>
              <input
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Type</label>
              <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid #e8e6e1' }}>
                {[{ label: 'Expense', val: true }, { label: 'Income', val: false }].map(({ label, val }) => (
                  <button key={label} type="button" onClick={() => setIsExpense(val)}
                    className="px-3 py-2 text-[11px] font-medium transition-colors"
                    style={{
                      backgroundColor: isExpense === val ? (val ? '#b05040' : '#4a7c3f') : '#fff',
                      color: isExpense === val ? '#fff' : '#555',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Category</label>
              <select
                value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid #e8e6e1', color: '#1a1a1a', backgroundColor: '#fff' }}
              >
                {(Object.entries(CATEGORY_META) as [TransactionCategory, typeof CATEGORY_META[TransactionCategory]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Date</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Note (optional)</label>
            <input
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-[34px] rounded-[7px] text-[13px] font-medium"
              style={{ border: '1px solid #e4e2dd', color: '#555' }}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 h-[34px] rounded-[7px] text-[13px] font-medium"
              style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const now = new Date()
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('v2-transactions', [])
  const [seeded, setSeeded] = useLocalStorage<boolean>('v2-transactions-seeded', false)
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [scope, setScope] = useState<'thismonth' | 'alltime'>('thismonth')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [highlightDay, setHighlightDay] = useState<number | null>(null)

  useEffect(() => {
    if (!seeded && transactions.length === 0) {
      setTransactions(SEED_TRANSACTIONS)
      setSeeded(true)
    }
  }, [seeded, transactions.length, setTransactions, setSeeded])

  const scopeFiltered = useMemo(() => {
    if (scope === 'alltime') return transactions
    return transactions.filter((t) => {
      const d = parseISO(t.date)
      return d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month
    })
  }, [transactions, scope, viewMonth])

  const typeFiltered = useMemo(() => {
    if (typeFilter === 'income') return scopeFiltered.filter((t) => t.amount > 0)
    if (typeFilter === 'expense') return scopeFiltered.filter((t) => t.amount < 0)
    return scopeFiltered
  }, [scopeFiltered, typeFilter])

  const logFiltered = useMemo(() => {
    return typeFiltered.filter((t) => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === 'all' || t.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [typeFiltered, search, categoryFilter])

  const income = useMemo(() => scopeFiltered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), [scopeFiltered])
  const expense = useMemo(() => scopeFiltered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [scopeFiltered])
  const balance = income - expense
  const savedPct = income > 0 ? Math.round((balance / income) * 100) : 0

  return (
    <>
      <V2Topbar actions={
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
          style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
        >
          <Plus size={13} />
          Add
        </button>
      } />

      <div className="p-5 flex flex-col gap-4">
        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid #e8e6e1' }}>
            {(['thismonth', 'alltime'] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className="px-3 h-[30px] text-[12px] font-medium transition-colors"
                style={{ backgroundColor: scope === s ? '#1a1a1a' : '#fff', color: scope === s ? '#fff' : '#555' }}>
                {s === 'thismonth' ? 'This month' : 'All time'}
              </button>
            ))}
          </div>
          <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid #e8e6e1' }}>
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 h-[30px] text-[12px] font-medium capitalize transition-colors"
                style={{ backgroundColor: typeFilter === t ? '#1a1a1a' : '#fff', color: typeFilter === t ? '#fff' : '#555' }}>
                {t}
              </button>
            ))}
          </div>
          {scope === 'thismonth' && (
            <div className="ml-auto">
              <MonthPicker
                year={viewMonth.year}
                month={viewMonth.month}
                onChange={(y, m) => setViewMonth({ year: y, month: m })}
              />
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          <StatCard label="Income" amount={income} sub="this period" accent="#4a7c3f" />
          <StatCard label="Expenses" amount={expense} sub="this period" accent="#b05040" />
          <StatCard label="Balance" amount={balance} sub={`${savedPct}% saved`} accent={balance >= 0 ? '#4a7c3f' : '#b05040'} />
        </div>

        {/* Mid section */}
        <div className="grid grid-cols-2 gap-4">
          <SpendingHeatmap
            transactions={transactions}
            year={viewMonth.year}
            month={viewMonth.month}
            onDayClick={(d) => setHighlightDay((prev) => prev === d ? null : d)}
          />
          <CategoryBreakdown transactions={scopeFiltered} />
        </div>

        {/* Transaction log */}
        <div className="bg-white rounded-[14px] p-4" style={{ border: '1px solid #e8e6e1' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 rounded-[7px] px-3 h-[30px]" style={{ border: '1px solid #e8e6e1' }}>
              <Search size={13} color="#bbb" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions…"
                className="flex-1 text-[12px] outline-none bg-transparent"
                style={{ color: '#1a1a1a' }}
              />
              {search && <button onClick={() => setSearch('')}><X size={12} color="#bbb" /></button>}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as TransactionCategory | 'all')}
              className="h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#555', backgroundColor: '#fff' }}
            >
              <option value="all">All categories</option>
              {(Object.entries(CATEGORY_META) as [TransactionCategory, typeof CATEGORY_META[TransactionCategory]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <TransactionLog transactions={logFiltered} highlightDay={highlightDay} />
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={(t) => setTransactions((prev) => [...prev, t])} />}
    </>
  )
}
