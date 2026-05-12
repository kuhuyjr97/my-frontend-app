'use client'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { format, getDaysInMonth, startOfMonth, getDay, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, ChevronDown, X, Search, Plus,
  UtensilsCrossed, Landmark, LineChart, Home, Bike, ShoppingBag, MoreHorizontal,
} from 'lucide-react'
import { getIcon } from '@/lib/v2/icon-registry'
import { toast } from 'sonner'
import { Types } from '@/app/enums/types'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import {
  fetchFinanceTransactions,
  fetchTypeEnums,
  createSavingTransaction,
  parseTransactionNumericId,
  updateSavingTransaction,
  deleteSavingTransaction,
  type FinanceTypeEnumRow,
} from '@/lib/v2/finance-api'
import { clearSessionTokens } from '@/lib/v2/auth-session'
import type { Transaction, TransactionCategory } from '@/lib/v2/types'

// ─── constants ───────────────────────────────────────────────────────────────
// ─── constants ───────────────────────────────────────────────────────────────
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

type TypeApiMeta = { label: string; color: string; iconName: string | null }
type TypeMetaMap = Map<string, TypeApiMeta>

function buildTypeMetaMap(rows: FinanceTypeEnumRow[]): TypeMetaMap {
  const m = new Map<string, TypeApiMeta>()
  for (const r of rows) {
    m.set(`${r.type}-${r.subType}`, {
      label: r.content?.trim() || String(r.subType),
      color: r.meta?.color ?? '#888888',
      iconName: r.meta?.icon ?? null,
    })
  }
  return m
}

function resolveTransactionMeta(t: Transaction, metaMap: TypeMetaMap) {
  const key = t.sourceType != null && t.subType != null ? `${t.sourceType}-${t.subType}` : null
  const api = key ? metaMap.get(key) : null
  const fallback = CATEGORY_META[t.category]
  return {
    color: api?.color ?? fallback.color,
    label: api?.label ?? fallback.label,
    Icon: getIcon(api?.iconName) ?? fallback.Icon,
  }
}

type CategoryFlow = 'expense' | 'income'

/** Bar color for breakdown rows (`st-` / `ist-` subtypes or coarse `cat-*`). */
function colorForCategoryBucket(key: string): string {
  if (key.startsWith('cat-')) {
    const cat = key.slice(4) as TransactionCategory
    return CATEGORY_META[cat]?.color ?? '#888888'
  }
  let h = 0
  for (let i = 0; i < key.length; i++) h = Math.imul(31, h) + key.charCodeAt(i)
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 40% 44%)`
}

const HEATMAP_COLORS = ['var(--v-hover)', '#e8d4c0', '#d8b090', '#c07050', '#a04030']

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.abs(n).toLocaleString('en-US')
}

/** Compact label for heatmap cells (k / M). */
function fmtHeatmapSpend(n: number): string {
  if (n <= 0) return '—'
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    const s = m % 1 < 0.05 ? m.toFixed(0) : m.toFixed(1)
    return `${s}M`
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

function fmtSigned(n: number) {
  const s = Math.abs(n).toLocaleString('en-US')
  return (n >= 0 ? '+' : '−') + s
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
    <div className="bg-white rounded-[12px] sm:rounded-[14px] p-2.5 sm:p-4 flex-1 min-w-0" style={{ border: '1px solid var(--v-border)' }}>
      <div className="text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 truncate" style={{ color: 'var(--v-text-3)' }}>{label}</div>
      <div className="text-[15px] sm:text-[22px] font-medium leading-tight truncate" style={{ color: accent }}>{fmt(amount)}</div>
      <div className="flex items-center gap-1 mt-0.5 min-w-0">
        <span className="text-[10px] sm:text-[11px] truncate" style={{ color: 'var(--v-text-3)' }}>{sub}</span>
        {trend !== undefined && (
          <span className="text-[10px] sm:text-[11px] shrink-0" style={{ color: trend >= 0 ? '#4a7c3f' : '#b05040' }}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}

function SpendingHeatmap({ transactions, year, month, onDayOpen }: {
  transactions: Transaction[]
  year: number; month: number
  onDayOpen: (day: number) => void
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
    <div className="bg-white rounded-[14px] p-4" style={{ border: '1px solid var(--v-border)' }}>
      <div className="text-[13px] font-medium mb-3" style={{ color: 'var(--v-text)' }}>Spending Heatmap</div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-[10px]" style={{ color: 'var(--v-muted)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="aspect-square min-w-0" />
          const spend = spendByDay[day] || 0
          const level = getHeatLevel(spend, maxSpend)
          const isToday2 = isCurrentMonth && today.getDate() === day
          const amtColor = level >= 3 ? '#fff' : 'var(--v-text)'
          const subColor = level >= 3 ? 'rgba(255,255,255,0.88)' : '#666'
          return (
            <button
              key={day}
              type="button"
              onClick={() => onDayOpen(day)}
              title={spend ? fmt(spend) : undefined}
              className="aspect-square min-w-0 rounded-[8px] flex flex-col items-center justify-center gap-0.5 px-1 py-1 transition-all hover:opacity-85 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: HEATMAP_COLORS[level],
                color: amtColor,
                outline: isToday2 ? '2px solid #1a1a1a' : 'none',
                outlineOffset: '-2px',
              }}
            >
              <span className="text-[13px] font-semibold tabular-nums leading-none">{day}</span>
              <span
                className="text-[10px] font-medium tabular-nums max-w-full truncate w-full text-center leading-tight px-0.5"
                style={{ color: subColor }}
              >
                {fmtHeatmapSpend(spend)}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px]" style={{ color: 'var(--v-muted)' }}>Low</span>
        {HEATMAP_COLORS.map((c, i) => (
          <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px]" style={{ color: 'var(--v-muted)' }}>High</span>
      </div>
    </div>
  )
}

/** Scroll when long; paginate when many buckets. */
const CAT_SCROLL_MAX_PX = 340
const CAT_PAGE_THRESHOLD = 12
const CAT_PAGE_SIZE = 8

type ExpenseBucketRow = { key: string; label: string; amount: number; pct: number }

function CategoryBreakdown({ transactions, onBucketOpen }: {
  transactions: Transaction[]
  onBucketOpen: (payload: { key: string; label: string; flow: CategoryFlow }) => void
}) {
  const [page, setPage] = useState(0)
  const [flow, setFlow] = useState<CategoryFlow>('expense')

  const inFlow = flow === 'expense'
    ? transactions.filter((t) => t.amount < 0)
    : transactions.filter((t) => t.amount > 0)

  const total = inFlow.reduce((s, t) => s + Math.abs(t.amount), 0)

  const bucketAgg = new Map<string, { label: string; amount: number }>()
  inFlow.forEach((t) => {
    const key =
      flow === 'expense'
        ? t.expenseBucketKey ?? `cat-${t.category}`
        : t.incomeBucketKey ?? `cat-${t.category}`
    const label =
      flow === 'expense'
        ? t.expenseBucketLabel ?? CATEGORY_META[t.category]?.label ?? 'Other'
        : t.incomeBucketLabel ?? CATEGORY_META[t.category]?.label ?? 'Other'
    const abs = Math.abs(t.amount)
    const prev = bucketAgg.get(key)
    if (prev) prev.amount += abs
    else bucketAgg.set(key, { label, amount: abs })
  })

  const sorted: ExpenseBucketRow[] = [...bucketAgg.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      amount: v.amount,
      pct: total ? Math.round((v.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const usePagination = sorted.length > CAT_PAGE_THRESHOLD
  const totalPages = usePagination ? Math.ceil(sorted.length / CAT_PAGE_SIZE) : 1
  const visible = usePagination
    ? sorted.slice(page * CAT_PAGE_SIZE, page * CAT_PAGE_SIZE + CAT_PAGE_SIZE)
    : sorted

  useEffect(() => {
    setPage(0)
  }, [transactions.length, sorted.length, flow])

  return (
    <div className="bg-white rounded-[14px] p-4 flex flex-col min-h-0" style={{ border: '1px solid var(--v-border)' }}>
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0 flex-wrap">
        <div className="text-[13px] font-medium min-w-0" style={{ color: 'var(--v-text)' }}>
          {flow === 'expense' ? 'Expense by Category' : 'Income by Category'}
        </div>
        <div className="flex rounded-[7px] overflow-hidden shrink-0" style={{ border: '1px solid var(--v-border)' }}>
          {(['expense', 'income'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFlow(f)}
              className="px-2.5 h-[26px] text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: flow === f ? 'var(--v-btn-bg)' : 'var(--v-surface)',
                color: flow === f ? 'var(--v-btn-text)' : 'var(--v-text-2)',
              }}
            >
              {f === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`flex flex-col gap-2.5 flex-1 min-h-0 ${usePagination ? '' : 'overflow-y-auto pr-0.5'}`}
        style={usePagination ? undefined : { maxHeight: CAT_SCROLL_MAX_PX }}
      >
        {visible.map(({ key, label, amount, pct }) => {
          const barColor = colorForCategoryBucket(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onBucketOpen({ key, label, flow })}
              className="flex items-center gap-2 w-full text-left rounded-[8px] -mx-1 px-1 py-0.5 hover:bg-[#f7f6f3] transition-colors cursor-pointer shrink-0"
            >
              <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
              <span className="text-[12px] min-w-0 flex-1 max-w-[38%] truncate" style={{ color: 'var(--v-text-2)' }} title={label}>{label}</span>
              <div className="flex-1 h-1.5 rounded-full min-w-0" style={{ backgroundColor: 'var(--v-hover)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span className="text-[12px] font-medium w-[72px] text-right shrink-0 tabular-nums" style={{ color: 'var(--v-text)' }}>{fmt(amount)}</span>
              <span className="text-[11px] w-9 text-right shrink-0 tabular-nums" style={{ color: 'var(--v-muted)' }}>{pct}%</span>
            </button>
          )
        })}
        {sorted.length === 0 && (
          <div className="text-[12px] text-center py-4" style={{ color: 'var(--v-muted)' }}>
            {flow === 'expense' ? 'No expenses this period' : 'No income this period'}
          </div>
        )}
      </div>

      {usePagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 shrink-0" style={{ borderTop: '1px solid var(--v-border-2)' }}>
          <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>
            {page * CAT_PAGE_SIZE + 1}–{Math.min((page + 1) * CAT_PAGE_SIZE, sorted.length)} / {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-6 h-6 flex items-center justify-center rounded-[6px] disabled:opacity-30 hover:bg-[#f0eeea]"
            >
              <ChevronLeft size={12} style={{ color: 'var(--v-text-2)' }} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[11px] font-medium transition-colors"
                style={{ backgroundColor: page === i ? 'var(--v-btn-bg)' : 'transparent', color: page === i ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="w-6 h-6 flex items-center justify-center rounded-[6px] disabled:opacity-30 hover:bg-[#f0eeea]"
            >
              <ChevronRight size={12} style={{ color: 'var(--v-text-2)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const LOG_PAGE_SIZE = 5

function TransactionsPopup({
  title,
  subtitle,
  transactions,
  typeMetaMap,
  onClose,
  onSelectTransaction,
}: {
  title: string
  subtitle?: string
  transactions: Transaction[]
  typeMetaMap: TypeMetaMap
  onClose: () => void
  /** When set, rows open the edit flow (e.g. from category breakdown). */
  onSelectTransaction?: (t: Transaction) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[14px] w-full max-w-md max-h-[min(85dvh,560px)] shadow-xl flex flex-col overflow-hidden"
        style={{ border: '1px solid var(--v-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-detail-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
          <div className="min-w-0">
            <div id="finance-detail-title" className="text-[14px] font-medium" style={{ color: 'var(--v-text)' }}>
              {title}
            </div>
            {subtitle && (
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--v-text-3)' }}>{subtitle}</div>
            )}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-1 rounded-[6px] hover:bg-[#f0eeea]" aria-label="Close">
            <X size={18} style={{ color: 'var(--v-text-3)' }} />
          </button>
        </div>
        <div className="overflow-y-auto p-2 flex-1 min-h-0">
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-[13px]" style={{ color: 'var(--v-muted)' }}>No transactions</div>
          ) : (
            <div className="flex flex-col gap-1">
              {transactions.map((t) => {
                const meta = resolveTransactionMeta(t, typeMetaMap)
                const Icon = meta.Icon
                const bucketLabel = t.amount < 0 ? t.expenseBucketLabel : t.incomeBucketLabel
                const subLine = bucketLabel ? `${bucketLabel} · ${t.date}` : `${meta.label} · ${t.date}`
                const inner = (
                  <>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.color + '18' }}
                    >
                      <Icon size={14} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: 'var(--v-text)' }}>{t.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--v-muted)' }}>{subLine}</div>
                    </div>
                    <span className="text-[13px] font-medium shrink-0" style={{ color: t.amount >= 0 ? '#4a7c3f' : '#b05040' }}>
                      {fmtSigned(t.amount)}
                    </span>
                  </>
                )
                if (onSelectTransaction) {
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTransaction(t)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] w-full text-left transition-colors hover:bg-[#fbfaf8]"
                      style={{ border: '1px solid #f0eeea' }}
                    >
                      {inner}
                    </button>
                  )
                }
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]"
                    style={{ border: '1px solid #f0eeea' }}
                  >
                    {inner}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TransactionLog({
  transactions,
  typeMetaMap,
  onSelectTransaction,
}: {
  transactions: Transaction[]
  typeMetaMap: TypeMetaMap
  onSelectTransaction?: (t: Transaction) => void
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

  useEffect(() => { setPage(0) }, [transactions.length])

  return (
    <div className="flex flex-col" style={{ minHeight: LOG_PAGE_SIZE * 110 }}>
      <div className="flex flex-col gap-3 flex-1">
      {pageDays.map((dateStr) => {
        const dayTxns = grouped[dateStr]
        const net = dayTxns.reduce((s, t) => s + t.amount, 0)
        const d = parseISO(dateStr)
        return (
          <div
            key={dateStr}
            className="rounded-[14px] overflow-hidden transition-all"
            style={{
              border: '1px solid var(--v-border)',
              backgroundColor: 'var(--v-surface)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--v-border-2)' }}
            >
              <span className="text-[12px] font-medium" style={{ color: 'var(--v-text-2)' }}>
                {format(d, 'EEEE, d MMM', { locale: enUS })}
              </span>
              <span className="text-[12px] font-medium" style={{ color: net >= 0 ? '#4a7c3f' : '#b05040' }}>
                {fmtSigned(net)}
              </span>
            </div>
            {dayTxns.map((t) => {
              const meta = resolveTransactionMeta(t, typeMetaMap)
              const Icon = meta.Icon
              const bucketLabel = t.amount < 0 ? t.expenseBucketLabel : t.incomeBucketLabel
              const inner = (
                <>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.color + '18' }}>
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--v-text)' }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--v-muted)' }}>
                      {bucketLabel ?? meta.label}
                    </div>
                  </div>
                  <span className="text-[13px] font-medium shrink-0" style={{ color: t.amount >= 0 ? '#4a7c3f' : '#b05040' }}>
                    {fmtSigned(t.amount)}
                  </span>
                </>
              )
              if (onSelectTransaction) {
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTransaction(t)}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-[#fbfaf8]"
                    style={{ borderBottom: '1px solid #f7f6f3' }}
                  >
                    {inner}
                  </button>
                )
              }
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid #f7f6f3' }}>
                  {inner}
                </div>
              )
            })}
          </div>
        )
      })}

      {sortedDays.length === 0 && (
        <div className="text-center py-12 text-[13px]" style={{ color: 'var(--v-muted)' }}>No transactions</div>
      )}
      </div>

      {/* Pagination pinned at bottom — doesn't move between pages */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid var(--v-border-2)' }}>
          <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>
            {page * LOG_PAGE_SIZE + 1}–{Math.min((page + 1) * LOG_PAGE_SIZE, sortedDays.length)} of {sortedDays.length} days
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] disabled:opacity-30 hover:bg-[#f0eeea]"
            >
              <ChevronLeft size={13} style={{ color: 'var(--v-text-2)' }} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className="w-7 h-7 flex items-center justify-center rounded-[7px] text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: page === i ? 'var(--v-btn-bg)' : 'transparent',
                  color: page === i ? 'var(--v-btn-text)' : 'var(--v-text-2)',
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
              <ChevronRight size={13} style={{ color: 'var(--v-text-2)' }} />
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
        type="button"
        onClick={() => {
          const d = new Date(year, month)
          d.setMonth(d.getMonth() - 1)
          onChange(d.getFullYear(), d.getMonth())
        }}
        className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
      >
        <ChevronLeft size={14} style={{ color: 'var(--v-text-2)' }} />
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className="h-[30px] px-3 rounded-[7px] text-[13px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[#f0eeea]"
        style={{ color: 'var(--v-text)', border: open ? '1px solid #e8e6e1' : '1px solid transparent', minWidth: 130 }}
      >
        {format(new Date(year, month), 'MMMM yyyy', { locale: enUS })}
        <ChevronDown size={12} style={{ color: 'var(--v-muted)' }} />
      </button>

      <button
        type="button"
        onClick={() => {
          const d = new Date(year, month)
          d.setMonth(d.getMonth() + 1)
          onChange(d.getFullYear(), d.getMonth())
        }}
        className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
      >
        <ChevronRight size={14} style={{ color: 'var(--v-text-2)' }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 z-50 bg-white rounded-[14px] p-3 shadow-lg left-1/2 -translate-x-1/2 w-[min(100vw-2rem,220px)] sm:left-auto sm:right-0 sm:translate-x-0 sm:w-[220px]"
          style={{ border: '1px solid var(--v-border)' }}
        >
          {/* Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
            >
              <ChevronLeft size={13} style={{ color: 'var(--v-text-2)' }} />
            </button>
            <span className="text-[13px] font-medium" style={{ color: 'var(--v-text)' }}>{pickerYear}</span>
            <button
              onClick={() => setPickerYear((y) => y + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]"
            >
              <ChevronRight size={13} style={{ color: 'var(--v-text-2)' }} />
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
                    backgroundColor: isSelected ? 'var(--v-btn-bg)' : isCurrentMonth ? 'var(--v-hover)' : 'transparent',
                    color: isSelected ? 'var(--v-btn-text)' : isCurrentMonth ? '#a07030' : 'var(--v-text-2)',
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

function AddSavingModal({
  onClose,
  onCreated,
  typeRows,
  loadingTypes,
}: {
  onClose: () => void
  onCreated: () => void | Promise<void>
  typeRows: FinanceTypeEnumRow[]
  loadingTypes: boolean
}) {
  const [submitting, setSubmitting] = useState(false)
  const initialForm = () => ({
    type: String(Types.EXPENSE),
    subtype: '',
    amount: '',
    content: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const subtypeOptions = useMemo(
    () =>
      typeRows
        .filter((t) => t.type === Number(form.type))
        .sort((a, b) =>
          String(a.content ?? '').localeCompare(String(b.content ?? ''), 'en'),
        ),
    [typeRows, form.type],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Sign in required')
      return
    }
    if (!form.subtype || !form.amount.trim() || !form.content.trim()) {
      toast.error('Fill in type, amount, and description')
      return
    }
    const amountNum = Number(form.amount.replace(/,/g, ''))
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount')
      return
    }
    setSubmitting(true)
    try {
      await createSavingTransaction(token, {
        type: Number(form.type),
        subType: Number(form.subtype),
        amount: Math.round(amountNum),
        content: form.content.trim(),
        createdAt: form.date,
      })
      toast.success('Transaction added')
      await onCreated()
      setForm(initialForm())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error'
      if (msg === 'UNAUTHORIZED') toast.error('Session expired — sign in again')
      else toast.error('Could not create transaction')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[14px] w-full max-w-[440px] max-h-[min(90dvh,680px)] overflow-y-auto shadow-xl"
        style={{ border: '1px solid var(--v-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--v-border-2)' }}
        >
          <span className="text-[14px] font-medium" style={{ color: 'var(--v-text)' }}>
            Add transaction
          </span>
          <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#f0eeea]" aria-label="Close">
            <X size={16} style={{ color: 'var(--v-text-3)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value, subtype: '' }))
                }
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}
              >
                <option value={String(Types.INCOME)}>Income</option>
                <option value={String(Types.EXPENSE)}>Expense</option>
              </select>
            </div>
            <div className="flex-[2] min-w-[180px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Subcategory
              </label>
              <select
                value={form.subtype}
                onChange={(e) => setForm((f) => ({ ...f, subtype: e.target.value }))}
                disabled={loadingTypes || subtypeOptions.length === 0}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none disabled:opacity-50"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}
              >
                <option value="">
                  {loadingTypes ? 'Loading…' : subtypeOptions.length === 0 ? 'No subcategories' : 'Select…'}
                </option>
                {subtypeOptions.map((row) => (
                  <option key={`${row.type}-${row.subType}`} value={String(row.subType)}>
                    {row.content?.trim() || row.subType}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Amount
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
              Description
            </label>
            <input
              type="text"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="What was this for?"
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[36px] rounded-[7px] text-[13px] font-medium"
              style={{ border: '1px solid #e4e2dd', color: 'var(--v-text-2)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingTypes}
              className="flex-1 h-[36px] rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
            >
              {submitting ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function transactionToEditForm(t: Transaction) {
  const inferredType =
    t.sourceType === Types.INCOME || t.sourceType === Types.EXPENSE
      ? t.sourceType
      : t.amount >= 0
        ? Types.INCOME
        : Types.EXPENSE
  return {
    type: String(inferredType),
    subtype: t.subType != null ? String(t.subType) : '',
    amount: String(Math.abs(t.amount)),
    content: t.name,
    date: t.date.slice(0, 10),
  }
}

function EditSavingModal({
  transaction,
  onClose,
  onSaved,
  typeRows,
  loadingTypes,
}: {
  transaction: Transaction
  onClose: () => void
  onSaved: () => void | Promise<void>
  typeRows: FinanceTypeEnumRow[]
  loadingTypes: boolean
}) {
  const numericId = useMemo(() => parseTransactionNumericId(transaction.id), [transaction.id])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState(() => transactionToEditForm(transaction))

  useEffect(() => {
    setForm(transactionToEditForm(transaction))
  }, [transaction])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const subtypeOptions = useMemo(
    () =>
      typeRows
        .filter((row) => row.type === Number(form.type))
        .sort((a, b) =>
          String(a.content ?? '').localeCompare(String(b.content ?? ''), 'en'),
        ),
    [typeRows, form.type],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Sign in required')
      return
    }
    if (numericId == null) {
      toast.error('This transaction cannot be edited here')
      return
    }
    if (!form.subtype || !form.amount.trim() || !form.content.trim()) {
      toast.error('Fill in type, amount, and description')
      return
    }
    const amountNum = Number(form.amount.replace(/,/g, ''))
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount')
      return
    }
    setSubmitting(true)
    try {
      await updateSavingTransaction(token, numericId, {
        type: Number(form.type),
        subType: Number(form.subtype),
        amount: Math.round(amountNum),
        content: form.content.trim(),
        createdAt: form.date,
      })
      toast.success('Updated')
      await onSaved()
      onClose()
    } catch {
      toast.error('Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this transaction?')) return
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Sign in required')
      return
    }
    if (numericId == null) {
      toast.error('This transaction cannot be deleted here')
      return
    }
    setDeleting(true)
    try {
      await deleteSavingTransaction(token, numericId)
      toast.success('Deleted')
      await onSaved()
      onClose()
    } catch {
      toast.error('Could not delete')
    } finally {
      setDeleting(false)
    }
  }

  const busy = submitting || deleting

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[14px] w-full max-w-[440px] max-h-[min(90dvh,720px)] overflow-y-auto shadow-xl"
        style={{ border: '1px solid var(--v-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--v-border-2)' }}
        >
          <span className="text-[14px] font-medium" style={{ color: 'var(--v-text)' }}>
            Edit transaction
          </span>
          <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#f0eeea]" aria-label="Close">
            <X size={16} style={{ color: 'var(--v-text-3)' }} />
          </button>
        </div>
        {numericId == null && (
          <div className="px-5 py-2 text-[12px]" style={{ color: '#b05040', backgroundColor: '#fff5f3' }}>
            This transaction cannot be edited via the Savings API.
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value, subtype: '' }))
                }
                disabled={busy}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none disabled:opacity-50"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}
              >
                <option value={String(Types.INCOME)}>Income</option>
                <option value={String(Types.EXPENSE)}>Expense</option>
              </select>
            </div>
            <div className="flex-[2] min-w-[180px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Subcategory
              </label>
              <select
                value={form.subtype}
                onChange={(e) => setForm((f) => ({ ...f, subtype: e.target.value }))}
                disabled={busy || loadingTypes || subtypeOptions.length === 0}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none disabled:opacity-50"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}
              >
                <option value="">
                  {loadingTypes ? 'Loading…' : subtypeOptions.length === 0 ? 'No subcategories' : 'Select…'}
                </option>
                {subtypeOptions.map((row) => (
                  <option key={`${row.type}-${row.subType}`} value={String(row.subType)}>
                    {row.content?.trim() || row.subType}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Amount
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                disabled={busy}
                placeholder="0"
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none disabled:opacity-50"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                disabled={busy}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none disabled:opacity-50"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>
              Description
            </label>
            <input
              type="text"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              disabled={busy}
              placeholder="What was this for?"
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none disabled:opacity-50"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
            />
          </div>
          <div className="flex gap-2 pt-2 flex-wrap items-center">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy || numericId == null}
              className="h-[36px] px-3 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ border: '1px solid #e8b4a8', color: '#b05040', backgroundColor: 'var(--v-surface)' }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <div className="flex-1 flex gap-2 justify-end min-w-[200px]">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-[36px] px-4 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
                style={{ border: '1px solid #e4e2dd', color: 'var(--v-text-2)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loadingTypes || numericId == null}
                className="h-[36px] px-4 rounded-[7px] text-[13px] font-medium disabled:opacity-50 min-w-[88px]"
                style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const now = new Date()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<'auth' | 'network' | null>(null)
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [scope, setScope] = useState<'thismonth' | 'alltime'>('thismonth')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'all'>('all')
  const [detailPopup, setDetailPopup] = useState<
    | { kind: 'day'; year: number; month: number; day: number }
    | { kind: 'bucket'; key: string; title: string; flow: CategoryFlow }
    | null
  >(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [typeEnums, setTypeEnums] = useState<FinanceTypeEnumRow[]>([])
  const [typeEnumsLoading, setTypeEnumsLoading] = useState(true)

  const typeMetaMap = useMemo(() => buildTypeMetaMap(typeEnums), [typeEnums])

  /** GET `/types` once on load (subcategories for add/edit forms). */
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setTypeEnumsLoading(false)
      return
    }
    let cancelled = false
    fetchTypeEnums(token)
      .then((rows) => {
        if (!cancelled) setTypeEnums(rows)
      })
      .finally(() => {
        if (!cancelled) setTypeEnumsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Single full fetch; month/scope filtered on the client. */
  const reload = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      setTransactions([])
      setLoadError('auth')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await fetchFinanceTransactions(token)
      setTransactions(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') clearSessionTokens()
      setLoadError(msg === 'UNAUTHORIZED' ? 'auth' : 'network')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

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

  const detailTransactions = useMemo(() => {
    if (!detailPopup) return []
    if (detailPopup.kind === 'day') {
      const ds = `${detailPopup.year}-${String(detailPopup.month + 1).padStart(2, '0')}-${String(detailPopup.day).padStart(2, '0')}`
      return scopeFiltered
        .filter((t) => t.date.slice(0, 10) === ds)
        .sort((a, b) => b.id.localeCompare(a.id))
    }
    const k = detailPopup.key
    const bucketFlow = detailPopup.flow
    if (bucketFlow === 'income') {
      return scopeFiltered
        .filter((t) => {
          if (t.amount <= 0) return false
          if (k.startsWith('ist-')) return t.incomeBucketKey === k
          if (k.startsWith('cat-')) {
            const cat = k.slice(4) as TransactionCategory
            return !t.incomeBucketKey && t.category === cat
          }
          return false
        })
        .sort((a, b) => {
          if (b.date !== a.date) return b.date.localeCompare(a.date)
          return b.id.localeCompare(a.id)
        })
    }
    return scopeFiltered
      .filter((t) => {
        if (t.amount >= 0) return false
        if (k.startsWith('st-')) return t.expenseBucketKey === k
        if (k.startsWith('cat-')) {
          const cat = k.slice(4) as TransactionCategory
          return !t.expenseBucketKey && t.category === cat
        }
        return false
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date)
        return b.id.localeCompare(a.id)
      })
  }, [detailPopup, scopeFiltered])

  const detailPopupTitle = useMemo(() => {
    if (!detailPopup) return ''
    if (detailPopup.kind === 'day') {
      const d = new Date(detailPopup.year, detailPopup.month, detailPopup.day)
      return format(d, 'EEEE, d MMMM yyyy', { locale: enUS })
    }
    return detailPopup.title
  }, [detailPopup])

  const detailPopupSubtitle = useMemo(() => {
    if (!detailPopup) return undefined
    if (detailPopup.kind === 'day') return 'All transactions this day (period)'
    if (detailPopup.kind === 'bucket')
      return detailPopup.flow === 'income' ? 'Income in this period' : 'Expenses in this period'
    return undefined
  }, [detailPopup])

  return (
    <>
      <V2Topbar />

      <div className="p-4 sm:p-5 flex flex-col gap-4 max-w-[1600px] mx-auto w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
        {loadError === 'auth' && (
          <div
            className="rounded-[12px] px-4 py-3 text-[13px]"
            style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)', color: 'var(--v-text-2)' }}
          >
            Sign in to load transactions from the server.{' '}
            <Link href="/v2/login" className="font-medium underline" style={{ color: 'var(--v-text)' }}>
              Login
            </Link>
          </div>
        )}
        {loadError === 'network' && (
          <div
            className="rounded-[12px] px-4 py-3 text-[13px] flex items-center justify-between gap-3 flex-wrap"
            style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)', color: 'var(--v-text-2)' }}
          >
            <span>Could not load data. Check the backend and NEXT_PUBLIC_BACKEND_URL.</span>
            <button
              type="button"
              onClick={() => void reload()}
              className="h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
              style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
            >
              Retry
            </button>
          </div>
        )}
        {loading && (
          <div className="text-[13px]" style={{ color: 'var(--v-text-3)' }}>
            Loading…
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:flex-wrap">
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid var(--v-border)' }}>
            {(['thismonth', 'alltime'] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className="px-3 h-[30px] text-[12px] font-medium transition-colors"
                style={{ backgroundColor: scope === s ? 'var(--v-btn-bg)' : 'var(--v-surface)', color: scope === s ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}>
                {s === 'thismonth' ? 'This month' : 'All time'}
              </button>
            ))}
          </div>
          </div>
          {scope === 'thismonth' && (
            <div className="min-[480px]:ml-auto w-full min-[480px]:w-auto flex min-[480px]:justify-end">
              <MonthPicker
                year={viewMonth.year}
                month={viewMonth.month}
                onChange={(y, m) => setViewMonth({ year: y, month: m })}
              />
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="Income" amount={income} sub="this period" accent="#4a7c3f" />
          <StatCard label="Expenses" amount={expense} sub="this period" accent="#b05040" />
          <StatCard label="Balance" amount={balance} sub={`${savedPct}% saved`} accent={balance >= 0 ? '#4a7c3f' : '#b05040'} />
        </div>

        {/* Mid section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SpendingHeatmap
            transactions={transactions}
            year={viewMonth.year}
            month={viewMonth.month}
            onDayOpen={(day) =>
              setDetailPopup({ kind: 'day', year: viewMonth.year, month: viewMonth.month, day })
            }
          />
          <CategoryBreakdown
            transactions={scopeFiltered}
            onBucketOpen={({ key, label, flow }) =>
              setDetailPopup({ kind: 'bucket', key, title: label, flow })
            }
          />
        </div>

        {/* Transaction log */}
        <div className="bg-white rounded-[14px] p-4" style={{ border: '1px solid var(--v-border)' }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0 rounded-[7px] px-3 h-[30px]" style={{ border: '1px solid var(--v-border)' }}>
              <Search size={13} style={{ color: 'var(--v-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions…"
                className="flex-1 text-[12px] outline-none bg-transparent"
                style={{ color: 'var(--v-text)' }}
              />
              {search && <button onClick={() => setSearch('')}><X size={12} style={{ color: 'var(--v-muted)' }} /></button>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid var(--v-border)' }}>
                {(['all', 'income', 'expense'] as const).map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className="px-2.5 h-[30px] text-[12px] font-medium capitalize transition-colors"
                    style={{ backgroundColor: typeFilter === t ? 'var(--v-btn-bg)' : 'var(--v-surface)', color: typeFilter === t ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}>
                    {t}
                  </button>
                ))}
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TransactionCategory | 'all')}
                className="h-[30px] w-full sm:w-auto shrink-0 px-2 rounded-[7px] text-[12px] outline-none"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)', backgroundColor: 'var(--v-surface)' }}
              >
                <option value="all">All categories</option>
                {(Object.entries(CATEGORY_META) as [TransactionCategory, typeof CATEGORY_META[TransactionCategory]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <TransactionLog
            transactions={logFiltered}
            typeMetaMap={typeMetaMap}
            onSelectTransaction={(t) => setEditTransaction(t)}
          />
        </div>
      </div>

      {/* Floating Add button */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        disabled={loadError === 'auth'}
        className="fixed bottom-[calc(56px+16px)] sm:bottom-6 right-4 sm:right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-30 disabled:opacity-40 transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
        aria-label="Thêm giao dịch"
      >
        <Plus size={20} />
      </button>

      {detailPopup && (
        <TransactionsPopup
          title={detailPopupTitle}
          subtitle={detailPopupSubtitle}
          transactions={detailTransactions}
          typeMetaMap={typeMetaMap}
          onClose={() => setDetailPopup(null)}
          onSelectTransaction={(t) => {
            setEditTransaction(t)
            setDetailPopup(null)
          }}
        />
      )}

      {showAdd && (
        <AddSavingModal
          typeRows={typeEnums}
          loadingTypes={typeEnumsLoading}
          onClose={() => setShowAdd(false)}
          onCreated={() => void reload()}
        />
      )}

      {editTransaction && (
        <EditSavingModal
          transaction={editTransaction}
          typeRows={typeEnums}
          loadingTypes={typeEnumsLoading}
          onClose={() => setEditTransaction(null)}
          onSaved={() => void reload()}
        />
      )}
    </>
  )
}
