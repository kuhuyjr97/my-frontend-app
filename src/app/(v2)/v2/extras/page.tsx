'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Plus, X, CreditCard, Fuel, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { clearSessionTokens } from '@/lib/v2/auth-session'
import {
  fetchPayLater, fetchFuel,
  createRecord, updateRecord, deleteRecord,
  type PayLaterCard, type PayLaterRecord, type FuelRecord,
} from '@/lib/v2/extras-api'

const PAY_LATER_TYPE = 6
const FUEL_TYPE = 7

function fmt(n: number) {
  return Math.abs(n).toLocaleString('en-US')
}

// ─── modal shell ──────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[14px] w-full max-w-[440px] overflow-y-auto shadow-xl"
        style={{ border: '1px solid var(--v-border)', maxHeight: 'min(92dvh,600px)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
          <span className="text-[14px] font-medium" style={{ color: 'var(--v-text)' }}>{title}</span>
          <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#f0eeea]">
            <X size={16} style={{ color: 'var(--v-text-3)' }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── PAY LATER TAB ────────────────────────────────────────────────────────────

type PLFormState = { cardId: string; isPayment: boolean; amount: string; content: string; date: string }
type FlatRecord = PayLaterRecord & { cardId: number; cardName: string; cardColor: string }

function PayLaterModal({
  cards,
  existing,
  existingCardId,
  defaultCardId,
  onClose,
  onSaved,
}: {
  cards: PayLaterCard[]
  existing?: PayLaterRecord
  existingCardId?: number
  defaultCardId?: number
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [form, setForm] = useState<PLFormState>(() => ({
    cardId: String(existingCardId ?? defaultCardId ?? cards[0]?.id ?? ''),
    isPayment: existing?.isPayment ?? false,
    amount: existing ? String(Math.abs(existing.amount)) : '',
    content: existing?.content ?? '',
    date: existing?.date ?? format(new Date(), 'yyyy-MM-dd'),
  }))
  const [submitting, setSubmitting] = useState(false)
  const selectedCard = cards.find((c) => c.id === Number(form.cardId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) { toast.error('Chưa đăng nhập'); return }
    if (!form.cardId) { toast.error('Chọn thẻ'); return }
    const amtNum = Number(form.amount)
    if (!form.amount || isNaN(amtNum) || amtNum <= 0) { toast.error('Nhập số tiền hợp lệ'); return }
    if (!form.content.trim()) { toast.error('Nhập mô tả'); return }
    const signed = form.isPayment ? -Math.round(amtNum) : Math.round(amtNum)
    setSubmitting(true)
    try {
      if (existing) {
        await updateRecord(token, existing.id, { typeEnumId: Number(form.cardId), amount: signed, content: form.content.trim(), createdAt: form.date })
        toast.success('Đã cập nhật')
      } else {
        await createRecord(token, { type: PAY_LATER_TYPE, typeEnumId: Number(form.cardId), amount: signed, content: form.content.trim(), createdAt: form.date })
        toast.success('Đã thêm')
      }
      await onSaved(); onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'UNAUTHORIZED') { clearSessionTokens(); toast.error('Hết phiên') }
      else toast.error('Lỗi, thử lại')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!existing || !window.confirm('Xóa giao dịch này?')) return
    const token = localStorage.getItem('token')
    if (!token) return
    setSubmitting(true)
    try {
      await deleteRecord(token, existing.id)
      toast.success('Đã xóa'); await onSaved(); onClose()
    } catch { toast.error('Không xóa được') }
    finally { setSubmitting(false) }
  }

  const accentColor = form.isPayment ? '#4a7c3f' : (selectedCard?.color ?? '#a07030')

  return (
    <ModalShell title={existing ? 'Sửa giao dịch thẻ' : 'Thêm giao dịch thẻ'} onClose={onClose}>
      {cards.length === 0 ? (
        <div className="p-5 text-[13px] text-center" style={{ color: 'var(--v-muted)' }}>
          Chưa có thẻ — vào <strong>Manage Types</strong> → nhóm <strong>Credit</strong> để thêm tên thẻ trước.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Thẻ</label>
            <select value={form.cardId} onChange={(e) => setForm((f) => ({ ...f, cardId: e.target.value }))}
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}>
              <option value="">Chọn thẻ…</option>
              {cards.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Loại</label>
            <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid var(--v-border)' }}>
              {([false, true] as const).map((ip) => (
                <button key={String(ip)} type="button" onClick={() => setForm((f) => ({ ...f, isPayment: ip }))}
                  className="flex-1 h-[36px] text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: form.isPayment === ip ? (ip ? '#4a7c3f' : (selectedCard?.color ?? '#a07030')) : 'var(--v-surface)',
                    color: form.isPayment === ip ? '#fff' : 'var(--v-text-2)',
                    borderRight: !ip ? '1px solid var(--v-border)' : 'none',
                  }}>
                  {ip ? '✓ Đã trả' : '+ Quẹt thẻ'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Số tiền</label>
              <input type="number" min={1} step={1} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0" className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }} />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Ngày</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Mô tả</label>
            <input type="text" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder={form.isPayment ? 'Trả bill tháng 5…' : 'Mua sắm, cà phê…'}
              className="w-full rounded-[7px] px-3 py-2 text-[16px] sm:text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }} />
          </div>
          <div className="flex gap-2 pt-1 flex-wrap items-center">
            {existing && (
              <button type="button" onClick={handleDelete} disabled={submitting}
                className="h-[36px] px-3 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
                style={{ border: '1px solid #e8b4a8', color: '#b05040', backgroundColor: 'var(--v-surface)' }}>
                Xóa
              </button>
            )}
            <div className="flex-1 flex gap-2 justify-end min-w-[180px]">
              <button type="button" onClick={onClose} disabled={submitting}
                className="h-[36px] px-4 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
                style={{ border: '1px solid #e4e2dd', color: 'var(--v-text-2)' }}>
                Hủy
              </button>
              <button type="submit" disabled={submitting}
                className="h-[36px] px-4 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
                style={{ backgroundColor: accentColor, color: '#fff' }}>
                {submitting ? 'Đang lưu…' : existing ? 'Lưu' : 'Thêm'}
              </button>
            </div>
          </div>
        </form>
      )}
    </ModalShell>
  )
}

function PayLaterTab() {
  const [cards, setCards] = useState<PayLaterCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<'auth' | 'network' | null>(null)
  const [cardFilter, setCardFilter] = useState<number | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editState, setEditState] = useState<{ rec: FlatRecord } | null>(null)

  const reload = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoadError('auth'); setLoading(false); return }
    setLoading(true); setLoadError(null)
    try { setCards(await fetchPayLater(token)) }
    catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') clearSessionTokens()
      setLoadError(msg === 'UNAUTHORIZED' ? 'auth' : 'network'); setCards([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const allRecords = useMemo<FlatRecord[]>(() => {
    const src = cardFilter === 'all' ? cards : cards.filter((c) => c.id === cardFilter)
    return src.flatMap((c) => c.records.map((r) => ({ ...r, cardId: c.id, cardName: c.name, cardColor: c.color })))
      .sort((a, b) => b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id)
  }, [cards, cardFilter])

  const totalDebt = useMemo(() => cards.reduce((s, c) => s + Math.max(0, c.currentBalance), 0), [cards])
  const defaultCardId = cardFilter !== 'all' ? cardFilter : cards[0]?.id

  return (
    <div className="flex flex-col gap-4">
      {loadError === 'auth' && <div className="rounded-[12px] px-4 py-3 text-[13px]" style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)' }}>Chưa đăng nhập</div>}
      {loadError === 'network' && (
        <div className="rounded-[12px] px-4 py-3 text-[13px] flex items-center justify-between gap-3" style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)' }}>
          <span>Không tải được</span>
          <button type="button" onClick={() => void reload()} className="h-[28px] px-3 rounded-[7px] text-[12px] font-medium" style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}>Thử lại</button>
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <div className="bg-white rounded-[12px] p-3 col-span-2 sm:col-span-1" style={{ border: '1px solid var(--v-border)' }}>
            <div className="text-[10px] sm:text-[11px] mb-0.5" style={{ color: 'var(--v-text-3)' }}>Tổng nợ còn lại</div>
            <div className="text-[18px] sm:text-[22px] font-semibold tabular-nums" style={{ color: totalDebt > 0 ? '#b05040' : '#4a7c3f' }}>{fmt(totalDebt)}</div>
          </div>
          {cards.map((c) => (
            <div key={c.id} className="bg-white rounded-[12px] p-3 cursor-pointer transition-all hover:opacity-80"
              style={{ border: `1px solid ${cardFilter === c.id ? c.color : 'var(--v-border)'}` }}
              onClick={() => setCardFilter(cardFilter === c.id ? 'all' : c.id)}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div className="text-[10px] sm:text-[11px] truncate" style={{ color: 'var(--v-text-3)' }}>{c.name}</div>
              </div>
              <div className="text-[15px] sm:text-[18px] font-semibold tabular-nums" style={{ color: c.currentBalance > 0 ? '#b05040' : '#4a7c3f' }}>{fmt(c.currentBalance)}</div>
              <div className="text-[10px]" style={{ color: 'var(--v-muted)' }}>{c.currentBalance > 0 ? 'còn nợ' : 'đã trả'}</div>
            </div>
          ))}
        </div>
      )}

      {cards.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" onClick={() => setCardFilter('all')}
            className="h-[28px] px-3 rounded-[6px] text-[12px] font-medium transition-colors"
            style={{ backgroundColor: cardFilter === 'all' ? 'var(--v-btn-bg)' : 'var(--v-hover)', color: cardFilter === 'all' ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}>
            Tất cả
          </button>
          {cards.map((c) => (
            <button key={c.id} type="button" onClick={() => setCardFilter(cardFilter === c.id ? 'all' : c.id)}
              className="h-[28px] px-3 rounded-[6px] text-[12px] font-medium transition-colors"
              style={{ backgroundColor: cardFilter === c.id ? c.color : 'var(--v-hover)', color: cardFilter === c.id ? '#fff' : 'var(--v-text-2)' }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-[13px]" style={{ color: 'var(--v-text-3)' }}>Đang tải…</div>
      ) : cards.length === 0 && !loadError ? (
        <div className="rounded-[14px] p-8 text-center flex flex-col items-center gap-2" style={{ border: '1.5px dashed var(--v-border)' }}>
          <CreditCard size={28} style={{ color: 'var(--v-muted)' }} />
          <div className="text-[13px] font-medium" style={{ color: 'var(--v-text-2)' }}>Chưa có thẻ nào</div>
          <div className="text-[12px]" style={{ color: 'var(--v-muted)' }}>Vào <strong>Manage Types</strong> → nhóm <strong>Credit</strong> để thêm tên thẻ.</div>
        </div>
      ) : (
        <PayLaterLog records={allRecords} onEdit={(r) => setEditState({ rec: r })} />
      )}

      {showAdd && <PayLaterModal cards={cards} defaultCardId={defaultCardId} onClose={() => setShowAdd(false)} onSaved={reload} />}
      {editState && <PayLaterModal cards={cards} existing={editState.rec} existingCardId={editState.rec.cardId} onClose={() => setEditState(null)} onSaved={reload} />}

      <button type="button" onClick={() => setShowAdd(true)} disabled={loadError === 'auth'}
        className="fixed bottom-[calc(56px+16px)] sm:bottom-6 right-4 sm:right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-30 disabled:opacity-40 transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}>
        <Plus size={20} />
      </button>
    </div>
  )
}

function PayLaterLog({ records, onEdit }: { records: FlatRecord[]; onEdit: (r: FlatRecord) => void }) {
  const grouped: Record<string, FlatRecord[]> = {}
  records.forEach((r) => { grouped[r.date] = grouped[r.date] || []; grouped[r.date].push(r) })
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  if (sortedDays.length === 0)
    return <div className="text-center py-12 text-[13px]" style={{ color: 'var(--v-muted)' }}>Chưa có giao dịch — bấm + để thêm</div>
  return (
    <div className="flex flex-col gap-3">
      {sortedDays.map((dateStr) => {
        const dayRecs = grouped[dateStr]
        const dayNet = dayRecs.reduce((s, r) => s + r.amount, 0)
        return (
          <div key={dateStr} className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <span className="text-[12px] font-medium" style={{ color: 'var(--v-text-2)' }}>{format(parseISO(dateStr), 'EEEE, d MMM', { locale: enUS })}</span>
              <span className="text-[12px] font-medium" style={{ color: dayNet > 0 ? '#b05040' : '#4a7c3f' }}>
                {dayNet > 0 ? '+' : ''}{dayNet.toLocaleString('en-US')}
              </span>
            </div>
            {dayRecs.map((rec) => (
              <button key={rec.id} type="button" onClick={() => onEdit(rec)}
                className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-[#fbfaf8]"
                style={{ borderBottom: '1px solid #f7f6f3' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: rec.cardColor + '18' }}>
                  <CreditCard size={14} style={{ color: rec.cardColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--v-text)' }}>{rec.content || '—'}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>{rec.cardName}</span>
                    {rec.isPayment && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#e6f5ea', color: '#4a7c3f', border: '1px solid #b8ddc0' }}>Đã trả</span>
                    )}
                  </div>
                </div>
                <span className="text-[13px] font-medium shrink-0 tabular-nums" style={{ color: rec.isPayment ? '#4a7c3f' : '#b05040' }}>
                  {rec.isPayment ? '−' : '+'}{fmt(rec.amount)}
                </span>
                <Pencil size={11} style={{ color: 'var(--v-muted)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── FUEL TYPES & HELPERS ─────────────────────────────────────────────────────
// Content field stores JSON: { l: liters, p: pricePerLiter, km: odometer, n: note }

type FuelData = {
  id: number
  date: string
  totalCost: number
  liters: number | null
  pricePerLiter: number | null
  odometer: number | null
  note: string
  consumption: number | null      // L/100km computed from consecutive odometer readings
  distanceTraveled: number | null // km since last fill
  costPerKm: number | null        // VND/km for this fill
}

function parseFuelRecord(r: FuelRecord): FuelData {
  let liters: number | null = null
  let pricePerLiter: number | null = null
  let odometer: number | null = null
  let note = r.content
  try {
    const d = JSON.parse(r.content)
    if (d && typeof d === 'object') {
      liters = typeof d.l === 'number' ? d.l : null
      pricePerLiter = typeof d.p === 'number' ? d.p : null
      odometer = typeof d.km === 'number' ? d.km : null
      note = typeof d.n === 'string' ? d.n : ''
    }
  } catch { /* plain-text note from old records */ }
  return { id: r.id, date: r.date, totalCost: r.amount, liters, pricePerLiter, odometer, note, consumption: null, distanceTraveled: null, costPerKm: null }
}

function withConsumptions(entries: FuelData[]): FuelData[] {
  // All entries with odometer → compute distanceTraveled and costPerKm
  const allWithKm = [...entries]
    .filter(e => e.odometer != null)
    .sort((a, b) => a.odometer! - b.odometer!)
  const distanceMap = new Map<number, number>()
  const costPerKmMap = new Map<number, number>()
  for (let i = 1; i < allWithKm.length; i++) {
    const dist = allWithKm[i].odometer! - allWithKm[i - 1].odometer!
    if (dist > 0) {
      distanceMap.set(allWithKm[i].id, dist)
      costPerKmMap.set(allWithKm[i].id, Math.round(allWithKm[i].totalCost / dist))
    }
  }

  // Only entries that also have liters → compute L/100km between consecutive such entries
  const withLiters = allWithKm.filter(e => e.liters != null && e.liters > 0)
  const consumptionMap = new Map<number, number>()
  for (let i = 1; i < withLiters.length; i++) {
    const dist = withLiters[i].odometer! - withLiters[i - 1].odometer!
    if (dist > 0) {
      consumptionMap.set(withLiters[i].id, Math.round((withLiters[i].liters! / dist) * 100 * 10) / 10)
    }
  }

  return entries.map(e => ({
    ...e,
    consumption: consumptionMap.get(e.id) ?? null,
    distanceTraveled: distanceMap.get(e.id) ?? null,
    costPerKm: costPerKmMap.get(e.id) ?? null,
  }))
}

function buildMonthlyData(entries: FuelData[]) {
  const map = new Map<string, { cost: number; liters: number; fills: number }>()
  entries.forEach(e => {
    const ym = e.date.slice(0, 7)
    const cur = map.get(ym) ?? { cost: 0, liters: 0, fills: 0 }
    map.set(ym, { cost: cur.cost + e.totalCost, liters: cur.liters + (e.liters ?? 0), fills: cur.fills + 1 })
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([ym, v]) => ({
      month: `T${Number(ym.slice(5))}/${ym.slice(2, 4)}`,
      cost: v.cost,
      liters: Math.round(v.liters * 10) / 10,
      fills: v.fills,
    }))
}

function buildCostPerKmTrend(entries: FuelData[]) {
  return entries
    .filter(e => e.costPerKm != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ label: e.date.slice(5).replace('-', '/'), vndPerKm: e.costPerKm! }))
}

function buildEfficiencyTrend(entries: FuelData[]) {
  return entries
    .filter(e => e.consumption != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ label: e.date.slice(5).replace('-', '/'), km100: e.consumption! }))
}

// ─── FUEL MODAL ───────────────────────────────────────────────────────────────

type FuelFormState = { liters: string; pricePerLiter: string; totalCost: string; odometer: string; note: string; date: string }

function FuelModal({ existing, onClose, onSaved }: { existing?: FuelData; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState<FuelFormState>(() => ({
    liters: existing?.liters != null ? String(existing.liters) : '',
    pricePerLiter: existing?.pricePerLiter != null ? String(existing.pricePerLiter) : '',
    totalCost: existing ? String(existing.totalCost) : '',
    odometer: existing?.odometer != null ? String(existing.odometer) : '',
    note: existing?.note ?? '',
    date: existing?.date ?? format(new Date(), 'yyyy-MM-dd'),
  }))
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field: keyof FuelFormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      const l = Number(next.liters)
      const p = Number(next.pricePerLiter)
      const t = Number(next.totalCost)
      if ((field === 'liters' || field === 'pricePerLiter') && l > 0 && p > 0) {
        next.totalCost = String(Math.round(l * p))
      } else if (field === 'totalCost' && t > 0 && p > 0) {
        next.liters = String(Math.round(t / p * 100) / 100)
      } else if (field === 'totalCost' && t > 0 && l > 0 && !next.pricePerLiter) {
        next.pricePerLiter = String(Math.round(t / l))
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) { toast.error('Chưa đăng nhập'); return }
    const totalNum = Number(form.totalCost)
    if (!form.totalCost || isNaN(totalNum) || totalNum <= 0) { toast.error('Nhập số tiền hợp lệ'); return }

    const contentObj: Record<string, unknown> = {}
    const l = Number(form.liters); const p = Number(form.pricePerLiter); const km = Number(form.odometer)
    if (l > 0) contentObj.l = Math.round(l * 100) / 100
    if (p > 0) contentObj.p = Math.round(p)
    if (km > 0) contentObj.km = Math.round(km)
    if (form.note.trim()) contentObj.n = form.note.trim()

    setSubmitting(true)
    try {
      if (existing) {
        await updateRecord(token, existing.id, { amount: Math.round(totalNum), content: JSON.stringify(contentObj), createdAt: form.date })
        toast.success('Đã cập nhật')
      } else {
        await createRecord(token, { type: FUEL_TYPE, typeEnumId: null, amount: Math.round(totalNum), content: JSON.stringify(contentObj), createdAt: form.date })
        toast.success('Đã thêm')
      }
      await onSaved(); onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'UNAUTHORIZED') { clearSessionTokens(); toast.error('Hết phiên') }
      else toast.error('Lỗi, thử lại')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!existing || !window.confirm('Xóa ghi chép này?')) return
    const token = localStorage.getItem('token')
    if (!token) return
    setSubmitting(true)
    try { await deleteRecord(token, existing.id); toast.success('Đã xóa'); await onSaved(); onClose() }
    catch { toast.error('Không xóa được') }
    finally { setSubmitting(false) }
  }

  return (
    <ModalShell title={existing ? 'Sửa ghi chép xăng' : 'Ghi chép đổ xăng'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
        {/* Auto-calc trio */}
        <div className="rounded-[10px] p-3 flex flex-col gap-2.5" style={{ backgroundColor: '#f4f9f3', border: '1px solid #c5dcc2' }}>
          <div className="text-[11px] font-medium" style={{ color: '#4a7c3f' }}>Nhập 2 trong 3 — ô còn lại tự tính</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { field: 'liters' as const, label: 'Số lít (L)', placeholder: '5.5' },
              { field: 'pricePerLiter' as const, label: 'Đơn giá (₫/L)', placeholder: '24000' },
              { field: 'totalCost' as const, label: 'Tổng tiền (₫)', placeholder: '132000' },
            ] as const).map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--v-text-2)' }}>{label}</label>
                <input
                  type="number" min={0} step="any"
                  value={form[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-[6px] px-2 py-1.5 text-[16px] sm:text-[13px] outline-none"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'white' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Số km (đồng hồ)</label>
            <input type="number" min={0} step={1} value={form.odometer} onChange={e => handleChange('odometer', e.target.value)}
              placeholder="45000" className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }} />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Ngày</label>
            <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)}
              className="w-full rounded-[7px] px-3 py-2 text-[16px] sm:text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }} />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Ghi chú (loại xăng, xe, …)</label>
          <input type="text" value={form.note} onChange={e => handleChange('note', e.target.value)}
            placeholder="Shell Q7, xe máy, đi làm…"
            className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }} />
        </div>

        <div className="flex gap-2 pt-1 flex-wrap items-center">
          {existing && (
            <button type="button" onClick={handleDelete} disabled={submitting}
              className="h-[36px] px-3 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ border: '1px solid #e8b4a8', color: '#b05040', backgroundColor: 'var(--v-surface)' }}>
              Xóa
            </button>
          )}
          <div className="flex-1 flex gap-2 justify-end min-w-[180px]">
            <button type="button" onClick={onClose} disabled={submitting}
              className="h-[36px] px-4 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ border: '1px solid #e4e2dd', color: 'var(--v-text-2)' }}>
              Hủy
            </button>
            <button type="submit" disabled={submitting}
              className="h-[36px] px-4 rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ backgroundColor: '#4a7c3f', color: '#fff' }}>
              {submitting ? 'Đang lưu…' : existing ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}

// ─── FUEL STAT CARDS ──────────────────────────────────────────────────────────

function FuelStatCards({ entries }: { entries: FuelData[] }) {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthEntries = entries.filter(e => e.date.startsWith(thisMonth))
  const monthCost = monthEntries.reduce((s, e) => s + e.totalCost, 0)
  const monthLiters = monthEntries.reduce((s, e) => s + (e.liters ?? 0), 0)
  const totalCost = entries.reduce((s, e) => s + e.totalCost, 0)
  const totalLiters = entries.reduce((s, e) => s + (e.liters ?? 0), 0)
  const withC = entries.filter(e => e.consumption != null)
  const avgC = withC.length > 0 ? Math.round(withC.reduce((s, e) => s + e.consumption!, 0) / withC.length * 10) / 10 : null
  const withCpk = entries.filter(e => e.costPerKm != null)
  const avgCpk = withCpk.length > 0 ? Math.round(withCpk.reduce((s, e) => s + e.costPerKm!, 0) / withCpk.length) : null

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <div className="rounded-[12px] p-3" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
        <div className="flex items-center gap-1 mb-0.5">
          <Fuel size={10} style={{ color: '#4a7c3f' }} />
          <span className="text-[10px] sm:text-[11px]" style={{ color: 'var(--v-text-3)' }}>Tháng này</span>
        </div>
        <div className="text-[15px] sm:text-[18px] font-semibold tabular-nums" style={{ color: '#4a7c3f' }}>{fmt(monthCost)} ₫</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-muted)' }}>
          {monthLiters > 0 ? `${Math.round(monthLiters * 10) / 10} L · ` : ''}{monthEntries.length} lần đổ
        </div>
      </div>

      <div className="rounded-[12px] p-3" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
        <div className="text-[10px] sm:text-[11px] mb-0.5" style={{ color: 'var(--v-text-3)' }}>Tổng cộng</div>
        <div className="text-[15px] sm:text-[18px] font-semibold tabular-nums" style={{ color: 'var(--v-text)' }}>{fmt(totalCost)} ₫</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-muted)' }}>
          {totalLiters > 0 ? `${Math.round(totalLiters * 10) / 10} L · ` : ''}{entries.length} lần
        </div>
      </div>

      <div className="rounded-[12px] p-3" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
        <div className="text-[10px] sm:text-[11px] mb-0.5" style={{ color: 'var(--v-text-3)' }}>Tiêu thụ trung bình</div>
        <div className="text-[15px] sm:text-[16px] font-semibold tabular-nums" style={{ color: '#4a7c3f' }}>
          {avgC != null ? `${avgC} L/100km` : '—'}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-muted)' }}>
          {avgC != null ? `${withC.length} lần có nhập số lít` : 'cần nhập số lít + km'}
        </div>
      </div>

      <div className="rounded-[12px] p-3" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
        <div className="text-[10px] sm:text-[11px] mb-0.5" style={{ color: 'var(--v-text-3)' }}>Trung bình VND/km</div>
        <div className="text-[15px] sm:text-[16px] font-semibold tabular-nums" style={{ color: '#e8850a' }}>
          {avgCpk != null ? `${fmt(avgCpk)} ₫/km` : '—'}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-muted)' }}>
          {avgCpk != null ? `${withCpk.length} lần có nhập km` : 'cần nhập số km'}
        </div>
      </div>
    </div>
  )
}

// ─── FUEL CHARTS ─────────────────────────────────────────────────────────────

const CHART_TOOLTIP_STYLE = { border: '1px solid #e8e6e0', borderRadius: 8, fontSize: 12, padding: '6px 10px' }
const GRID_STROKE = '#ece9e4'

function FuelCharts({ entries }: { entries: FuelData[] }) {
  const [open, setOpen] = useState(true)
  const monthly = useMemo(() => buildMonthlyData(entries), [entries])
  const costPerKmTrend = useMemo(() => buildCostPerKmTrend(entries), [entries])
  const effTrend = useMemo(() => buildEfficiencyTrend(entries), [entries])

  const hasMonthly = monthly.length >= 2
  const hasLitersByMonth = hasMonthly && monthly.some(m => m.liters > 0)
  const hasCpk = costPerKmTrend.length >= 2
  const hasEff = effTrend.length >= 2

  if (!hasMonthly && !hasCpk && !hasEff) return null

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-0 py-0.5"
      >
        <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--v-text-3)' }}>Biểu đồ</span>
        <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>{open ? '▲ Thu gọn' : '▼ Xem'}</span>
      </button>
      {open && (
        <>
          {/* Monthly cost */}
          {hasMonthly && (
            <div className="rounded-[14px] p-4" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
              <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--v-text-2)' }}>Chi phí theo tháng (₫)</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthly} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number) => [v.toLocaleString('en-US') + ' ₫', 'Chi phí']}
                    labelFormatter={l => `Tháng ${l}`}
                  />
                  <Bar dataKey="cost" fill="#4a7c3f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly liters */}
          {hasLitersByMonth && (
            <div className="rounded-[14px] p-4" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
              <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--v-text-2)' }}>Lít xăng theo tháng (L)</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthly} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number) => [`${v} L`, 'Số lít']}
                    labelFormatter={l => `Tháng ${l}`}
                  />
                  <Bar dataKey="liters" fill="#7ab573" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* VND/km trend */}
          {hasCpk && (
            <div className="rounded-[14px] p-4" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
              <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--v-text-2)' }}>Chi phí mỗi km (₫/km)</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={costPerKmTrend} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number) => [v.toLocaleString('en-US') + ' ₫/km', 'VND/km']}
                  />
                  <Line type="monotone" dataKey="vndPerKm" stroke="#e8850a" strokeWidth={2} dot={{ fill: '#e8850a', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Efficiency trend */}
          {hasEff && (
            <div className="rounded-[14px] p-4" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12px] font-medium" style={{ color: 'var(--v-text-2)' }}>Mức tiêu thụ (L/100km)</div>
                <div className="text-[11px]" style={{ color: 'var(--v-muted)' }}>thấp hơn = tốt hơn</div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={effTrend} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(v: number) => [`${v} L/100km`, 'Tiêu thụ']}
                  />
                  <Line type="monotone" dataKey="km100" stroke="#4a7c3f" strokeWidth={2} dot={{ fill: '#4a7c3f', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── FUEL LIST ────────────────────────────────────────────────────────────────

function FuelList({ entries, onEdit }: { entries: FuelData[]; onEdit: (e: FuelData) => void }) {
  const grouped: Record<string, FuelData[]> = {}
  entries.forEach(e => { grouped[e.date] = grouped[e.date] || []; grouped[e.date].push(e) })
  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (sortedDays.length === 0)
    return (
      <div className="rounded-[14px] p-8 text-center flex flex-col items-center gap-2" style={{ border: '1.5px dashed var(--v-border)' }}>
        <Fuel size={28} style={{ color: 'var(--v-muted)' }} />
        <div className="text-[13px] font-medium" style={{ color: 'var(--v-text-2)' }}>Chưa có ghi chép nào</div>
        <div className="text-[12px]" style={{ color: 'var(--v-muted)' }}>Bấm + để ghi chép đổ xăng</div>
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      {sortedDays.map(dateStr => {
        const dayRecs = grouped[dateStr]
        const dayTotal = dayRecs.reduce((s, r) => s + r.totalCost, 0)
        const dayLiters = dayRecs.reduce((s, r) => s + (r.liters ?? 0), 0)
        return (
          <div key={dateStr} className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <span className="text-[12px] font-medium" style={{ color: 'var(--v-text-2)' }}>
                {format(parseISO(dateStr), 'EEEE, d MMM', { locale: enUS })}
              </span>
              <div className="flex items-center gap-2">
                {dayLiters > 0 && <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>{Math.round(dayLiters * 10) / 10} L</span>}
                <span className="text-[12px] font-medium" style={{ color: '#4a7c3f' }}>{fmt(dayTotal)} ₫</span>
              </div>
            </div>
            {dayRecs.map(rec => (
              <button key={rec.id} type="button" onClick={() => onEdit(rec)}
                className="flex items-center gap-3 px-4 py-3 w-full text-left transition-colors hover:bg-[#fbfaf8]"
                style={{ borderBottom: '1px solid #f7f6f3' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#4a7c3f18' }}>
                  <Fuel size={15} style={{ color: '#4a7c3f' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--v-text)' }}>
                    {rec.note || (rec.liters ? `${rec.liters} L` : 'Đổ xăng')}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    {rec.liters != null && (
                      <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>{rec.liters} L</span>
                    )}
                    {rec.odometer != null && (
                      <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>{rec.odometer.toLocaleString('en-US')} km</span>
                    )}
                    {rec.distanceTraveled != null && (
                      <span className="text-[11px]" style={{ color: 'var(--v-muted)' }}>+{rec.distanceTraveled.toLocaleString('en-US')} km</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {rec.consumption != null && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#e6f5ea', color: '#4a7c3f', border: '1px solid #b8ddc0' }}>
                        {rec.consumption} L/100km
                      </span>
                    )}
                    {rec.costPerKm != null && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#fdf3e6', color: '#b06a10', border: '1px solid #f0c888' }}>
                        {fmt(rec.costPerKm)} ₫/km
                      </span>
                    )}
                    {rec.distanceTraveled != null && rec.liters == null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--v-hover)', color: 'var(--v-muted)', border: '1px solid var(--v-border)' }}>
                        nhập số lít → L/100km
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-[13px] font-medium tabular-nums" style={{ color: '#4a7c3f' }}>{fmt(rec.totalCost)} ₫</span>
                  <Pencil size={11} style={{ color: 'var(--v-muted)' }} />
                </div>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── FUEL TAB ─────────────────────────────────────────────────────────────────

function FuelTab() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<'auth' | 'network' | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState<FuelData | null>(null)

  const reload = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoadError('auth'); setLoading(false); return }
    setLoading(true); setLoadError(null)
    try { setRecords(await fetchFuel(token)) }
    catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') clearSessionTokens()
      setLoadError(msg === 'UNAUTHORIZED' ? 'auth' : 'network'); setRecords([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const entries = useMemo(() => withConsumptions(records.map(parseFuelRecord)), [records])

  return (
    <div className="flex flex-col gap-4">
      {loadError === 'auth' && <div className="rounded-[12px] px-4 py-3 text-[13px]" style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)' }}>Chưa đăng nhập</div>}
      {loadError === 'network' && (
        <div className="rounded-[12px] px-4 py-3 text-[13px] flex items-center justify-between gap-3" style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)' }}>
          <span>Không tải được</span>
          <button type="button" onClick={() => void reload()} className="h-[28px] px-3 rounded-[7px] text-[12px] font-medium" style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}>Thử lại</button>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          <FuelStatCards entries={entries} />
          <FuelCharts entries={entries} />
        </>
      )}

      {loading ? (
        <div className="text-[13px]" style={{ color: 'var(--v-text-3)' }}>Đang tải…</div>
      ) : (
        <FuelList entries={entries} onEdit={setEditEntry} />
      )}

      {showAdd && <FuelModal onClose={() => setShowAdd(false)} onSaved={reload} />}
      {editEntry && <FuelModal existing={editEntry} onClose={() => setEditEntry(null)} onSaved={reload} />}

      <button type="button" onClick={() => setShowAdd(true)} disabled={loadError === 'auth'}
        className="fixed bottom-[calc(56px+16px)] sm:bottom-6 right-4 sm:right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center z-30 disabled:opacity-40 transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#4a7c3f', color: '#fff' }}>
        <Plus size={20} />
      </button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type Tab = 'credit' | 'fuel'

export default function ExtrasPage() {
  const [tab, setTab] = useState<Tab>('credit')

  return (
    <>
      <V2Topbar />
      <div className="p-4 sm:p-5 flex flex-col gap-4 max-w-[900px] mx-auto w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--v-border)' }}>
          <button type="button" onClick={() => setTab('credit')}
            className="flex-1 flex items-center justify-center gap-2 h-[40px] text-[13px] font-medium transition-colors"
            style={{ backgroundColor: tab === 'credit' ? 'var(--v-btn-bg)' : 'var(--v-surface)', color: tab === 'credit' ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}>
            <CreditCard size={15} style={{ color: tab === 'credit' ? 'var(--v-btn-text)' : '#a07030' }} />
            Trả Sau
          </button>
          <button type="button" onClick={() => setTab('fuel')}
            className="flex-1 flex items-center justify-center gap-2 h-[40px] text-[13px] font-medium transition-colors"
            style={{ backgroundColor: tab === 'fuel' ? '#4a7c3f' : 'var(--v-surface)', color: tab === 'fuel' ? '#fff' : 'var(--v-text-2)' }}>
            <Fuel size={15} style={{ color: tab === 'fuel' ? '#fff' : '#4a7c3f' }} />
            Nhiên Liệu
          </button>
        </div>

        {tab === 'credit' && <PayLaterTab />}
        {tab === 'fuel' && <FuelTab />}
      </div>
    </>
  )
}
