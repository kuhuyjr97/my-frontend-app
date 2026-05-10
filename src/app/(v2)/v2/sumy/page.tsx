'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  format,
  parseISO,
  startOfWeek,
  addDays,
  getDay,
  getDaysInMonth,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Droplets, Baby, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import {
  fetchRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  type MilkRecord,
  type RecordType,
  type PumpSide,
} from '@/lib/v2/sumy-api'

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_ML = 500
const PINK = '#c97a8a'
const BLUE = '#4a72b0'
const GREEN = '#4a8a4a'
const PINK_BG = '#fbeaf0'
const BLUE_BG = '#e8f0fb'

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// ─── types ────────────────────────────────────────────────────────────────────

interface DailySummary {
  pumpTotal: number
  pumpTimes: number
  feedTotal: number
  feedTimes: number
  balance: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function computeSummary(records: MilkRecord[]): DailySummary {
  const pump = records.filter((r) => r.type === 'pump')
  const feed = records.filter((r) => r.type === 'feed')
  return {
    pumpTotal: Math.round(pump.reduce((s, r) => s + r.amount, 0)),
    pumpTimes: pump.length,
    feedTotal: Math.round(feed.reduce((s, r) => s + r.amount, 0)),
    feedTimes: feed.length,
    balance: Math.round(
      pump.reduce((s, r) => s + r.amount, 0) -
        feed.reduce((s, r) => s + r.amount, 0),
    ),
  }
}

function filterByDate(records: MilkRecord[], date: string): MilkRecord[] {
  return records.filter((r) => r.date === date)
}

function getWeekDates(date: string): string[] {
  const d = parseISO(date)
  const monday = startOfWeek(d, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(monday, i), 'yyyy-MM-dd'),
  )
}

function getMonthGrid(yearMonth: string): { date: string; inMonth: boolean }[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = getDaysInMonth(firstDay)
  const firstDow = getDay(firstDay) // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1

  const cells: { date: string; inMonth: boolean }[] = []

  for (let i = startOffset; i > 0; i--) {
    cells.push({
      date: format(new Date(year, month - 1, 1 - i), 'yyyy-MM-dd'),
      inMonth: false,
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${yearMonth}-${String(d).padStart(2, '0')}`,
      inMonth: true,
    })
  }
  const rem = cells.length % 7
  if (rem > 0) {
    for (let i = 1; i <= 7 - rem; i++) {
      cells.push({
        date: format(new Date(year, month, i), 'yyyy-MM-dd'),
        inMonth: false,
      })
    }
  }
  return cells
}

// ─── StatsRow ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div
      className="flex-1 rounded-[12px] px-3 py-[10px] bg-white"
      style={{ border: '0.5px solid #e8e6e1' }}
    >
      <div className="text-[16px] font-medium" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: '#999' }}>
        {label}
      </div>
    </div>
  )
}

function StatsRow({ summary }: { summary: DailySummary }) {
  return (
    <div className="flex gap-2 mb-3">
      <StatCard label="Đã hút (ml)" value={summary.pumpTotal} color={PINK} />
      <StatCard label="Bé uống (ml)" value={summary.feedTotal} color={BLUE} />
      <StatCard
        label={summary.balance >= 0 ? 'Dư (ml)' : 'Thiếu (ml)'}
        value={Math.abs(summary.balance)}
        color={summary.balance >= 0 ? GREEN : PINK}
      />
    </div>
  )
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────

function ViewToggle({
  mode,
  onChange,
}: {
  mode: 'week' | 'month'
  onChange: (m: 'week' | 'month') => void
}) {
  return (
    <div
      className="flex rounded-[10px] p-1 mb-3"
      style={{ backgroundColor: '#f0eeea' }}
    >
      {(['week', 'month'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className="flex-1 rounded-[8px] py-1.5 text-[12px] font-medium transition-colors"
          style={{
            backgroundColor: mode === m ? '#fff' : 'transparent',
            color: mode === m ? '#1a1a1a' : '#999',
          }}
        >
          {m === 'week' ? 'Tuần' : 'Tháng'}
        </button>
      ))}
    </div>
  )
}

// ─── WeekStrip ────────────────────────────────────────────────────────────────

function WeekStrip({
  weekDates,
  selectedDate,
  today,
  records,
  onSelect,
}: {
  weekDates: string[]
  selectedDate: string
  today: string
  records: MilkRecord[]
  onSelect: (date: string) => void
}) {
  return (
    <div className="flex gap-1.5 mb-3">
      {weekDates.map((date, i) => {
        const dayRecs = filterByDate(records, date)
        const sum = computeSummary(dayRecs)
        const pumpH = Math.min(sum.pumpTotal / MAX_ML, 1) * 64
        const feedH = Math.min(Math.max(64 - pumpH, 0), (sum.feedTotal / MAX_ML) * 64)
        const isToday = date === today
        const isSelected = date === selectedDate
        const dayNum = parseInt(date.split('-')[2])

        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <span className="text-[10px]" style={{ color: '#999' }}>
              {DAY_NAMES[i]}
            </span>
            <div
              className="w-full rounded-[8px] overflow-hidden flex flex-col"
              style={{
                height: 64,
                border: isToday
                  ? `1.5px solid ${PINK}`
                  : isSelected
                    ? '1.5px solid #1a1a1a'
                    : '1px solid #e8e6e1',
                backgroundColor: '#f7f6f3',
              }}
            >
              <div style={{ height: pumpH, backgroundColor: '#e8aab8' }} />
              <div style={{ height: feedH, backgroundColor: '#a8bce8' }} />
              <div style={{ flex: 1, backgroundColor: '#d0cdc8' }} />
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: isToday ? PINK : '#666' }}
            >
              {dayNum}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── MonthCalendar ────────────────────────────────────────────────────────────

function MonthCalendar({
  currentMonth,
  selectedDate,
  today,
  records,
  onSelect,
  onMonthChange,
}: {
  currentMonth: string
  selectedDate: string
  today: string
  records: MilkRecord[]
  onSelect: (date: string) => void
  onMonthChange: (month: string) => void
}) {
  const cells = getMonthGrid(currentMonth)
  const [year, month] = currentMonth.split('-').map(Number)

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', {
    locale: vi,
  })

  const prevMonth = () =>
    onMonthChange(format(new Date(year, month - 2, 1), 'yyyy-MM'))
  const nextMonth = () =>
    onMonthChange(format(new Date(year, month, 1), 'yyyy-MM'))

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1" style={{ color: '#999' }}>
          <ChevronLeft size={16} />
        </button>
        <span
          className="text-[12px] font-medium capitalize"
          style={{ color: '#1a1a1a' }}
        >
          {monthLabel}
        </span>
        <button onClick={nextMonth} className="p-1" style={{ color: '#999' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px]"
            style={{ color: '#999' }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map(({ date, inMonth }) => {
          const dayRecs = inMonth ? filterByDate(records, date) : []
          const sum = computeSummary(dayRecs)
          const hasData = dayRecs.length > 0
          const isToday = date === today
          const isSelected = date === selectedDate
          const dayNum = parseInt(date.split('-')[2])

          return (
            <button
              key={date}
              onClick={() => inMonth && onSelect(date)}
              className="rounded-[10px] text-left"
              style={{
                minHeight: 58,
                padding: '5px 4px 6px',
                backgroundColor: !inMonth || !hasData ? '#f7f6f3' : '#fff',
                border: isSelected
                  ? '1px solid #1a1a1a'
                  : isToday
                    ? `1px solid ${PINK}`
                    : '0.5px solid #e8e6e1',
                opacity: !inMonth ? 0.3 : 1,
              }}
            >
              <div
                className="text-[10px] font-medium text-center mb-0.5"
                style={{ color: isToday ? PINK : '#1a1a1a' }}
              >
                {dayNum}
              </div>
              {hasData && (
                <div className="flex flex-col gap-[2px]">
                  <div className="flex items-center gap-[2px]">
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: PINK,
                      }}
                    />
                    <span className="text-[9px]" style={{ color: '#666' }}>
                      {sum.pumpTotal}
                    </span>
                  </div>
                  <div className="flex items-center gap-[2px]">
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: BLUE,
                      }}
                    />
                    <span className="text-[9px]" style={{ color: '#666' }}>
                      {sum.feedTotal}
                    </span>
                  </div>
                  <div className="flex items-center gap-[2px]">
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: '#aaa',
                      }}
                    />
                    <span className="text-[9px]" style={{ color: '#666' }}>
                      {sum.balance >= 0 ? '+' : ''}
                      {sum.balance}
                    </span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-4 mb-3">
      {[
        { color: '#e8aab8', label: 'Hút' },
        { color: '#a8bce8', label: 'Uống' },
        { color: '#d0cdc8', label: 'Dư' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: color }}
          />
          <span className="text-[10px]" style={{ color: '#999' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── DetailCard ───────────────────────────────────────────────────────────────

function DetailCard({
  date,
  records,
}: {
  date: string
  records: MilkRecord[]
}) {
  const sum = computeSummary(records)
  const dateLabel = format(parseISO(date), "EEEE, d/M/yyyy", { locale: vi })
  const pos = sum.balance >= 0

  return (
    <div
      className="rounded-[14px] p-[14px] mb-3 bg-white"
      style={{ border: '0.5px solid #e8e6e1' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[12px] font-medium capitalize"
          style={{ color: '#1a1a1a' }}
        >
          {dateLabel}
        </span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-[20px]"
          style={{
            backgroundColor: pos ? '#eaf5ea' : PINK_BG,
            color: pos ? GREEN : PINK,
          }}
        >
          {pos ? '+' : ''}
          {sum.balance} ml {pos ? 'dư' : 'thiếu'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets size={14} color={PINK} />
            <span className="text-[11px]" style={{ color: '#999' }}>
              Đã hút
            </span>
          </div>
          <div
            className="text-[15px] font-medium"
            style={{ color: PINK }}
          >
            {sum.pumpTotal} ml
          </div>
          <div className="text-[10px]" style={{ color: '#999' }}>
            {sum.pumpTimes} lần ·{' '}
            {sum.pumpTimes > 0
              ? Math.round(sum.pumpTotal / sum.pumpTimes)
              : 0}{' '}
            ml/lần
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Baby size={14} color={BLUE} />
            <span className="text-[11px]" style={{ color: '#999' }}>
              Bé uống
            </span>
          </div>
          <div
            className="text-[15px] font-medium"
            style={{ color: BLUE }}
          >
            {sum.feedTotal} ml
          </div>
          <div className="text-[10px]" style={{ color: '#999' }}>
            {sum.feedTimes} lần ·{' '}
            {sum.feedTimes > 0
              ? Math.round(sum.feedTotal / sum.feedTimes)
              : 0}{' '}
            ml/lần
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Log ──────────────────────────────────────────────────────────────────────

function Log({
  records,
  onEdit,
  onDelete,
}: {
  records: MilkRecord[]
  onEdit: (record: MilkRecord) => void
  onDelete: (id: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (records.length === 0) {
    return (
      <div
        className="rounded-[14px] p-4 bg-white mb-3 text-center"
        style={{ border: '0.5px solid #e8e6e1' }}
      >
        <span className="text-[12px]" style={{ color: '#bbb' }}>
          Chưa có ghi chép hôm nay
        </span>
      </div>
    )
  }

  const sorted = [...records].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  )

  return (
    <div
      className="rounded-[14px] bg-white mb-3 overflow-hidden"
      style={{ border: '0.5px solid #e8e6e1' }}
    >
      {sorted.map((rec, i) => {
        const isPump = rec.type === 'pump'
        const time = format(parseISO(rec.recordedAt), 'HH:mm')
        const label = isPump
          ? `Hút sữa${rec.side ? ` · ${rec.side === 'left' ? 'Trái' : rec.side === 'right' ? 'Phải' : 'Hai bên'}` : ''}`
          : 'Bé uống'
        const isSelected = selectedId === rec.id

        return (
          <div
            key={rec.id}
            style={{ borderTop: i === 0 ? 'none' : '0.5px solid #f0eeea' }}
          >
            {/* Row */}
            <button
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              onClick={() => setSelectedId(isSelected ? null : rec.id)}
            >
              <span className="text-[11px] w-9 shrink-0" style={{ color: '#999' }}>
                {time}
              </span>
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: isPump ? PINK_BG : BLUE_BG }}
              >
                {isPump ? (
                  <Droplets size={13} color={PINK} />
                ) : (
                  <Baby size={13} color={BLUE} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] block" style={{ color: '#1a1a1a' }}>
                  {label}
                </span>
                {rec.note && (
                  <span className="text-[10px]" style={{ color: '#999' }}>
                    {rec.note}
                  </span>
                )}
              </div>
              <span
                className="text-[13px] font-medium shrink-0"
                style={{ color: isPump ? PINK : BLUE }}
              >
                {rec.amount}ml
              </span>
            </button>

            {/* Inline actions */}
            {isSelected && (
              <div
                className="flex gap-2 px-3 pb-2.5"
                style={{ backgroundColor: '#faf9f7' }}
              >
                <button
                  onClick={() => { onEdit(rec); setSelectedId(null) }}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium"
                  style={{ backgroundColor: '#fff', color: '#1a1a1a', border: '0.5px solid #e8e6e1' }}
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => { onDelete(rec.id); setSelectedId(null) }}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium"
                  style={{ backgroundColor: PINK_BG, color: PINK }}
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function Chart({
  allRecords,
  today,
}: {
  allRecords: MilkRecord[]
  today: string
}) {
  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (7 - i))
    return format(d, 'yyyy-MM-dd')
  })

  const data = days.map((date) => {
    const recs = filterByDate(allRecords, date)
    const sum = computeSummary(recs)
    return { date, ...sum }
  })

  return (
    <div
      className="rounded-[14px] p-4 bg-white mb-6"
      style={{ border: '0.5px solid #e8e6e1' }}
    >
      <div className="text-[11px] mb-3" style={{ color: '#999' }}>
        8 ngày gần nhất
      </div>
      <div className="flex flex-col gap-2">
        {data.map(({ date, pumpTotal, feedTotal }) => {
          const pumpW = Math.min((pumpTotal / MAX_ML) * 100, 100)
          const feedW = Math.min((feedTotal / MAX_ML) * 100, 100 - pumpW)
          const total = pumpTotal + feedTotal
          const [, m, d] = date.split('-').map(Number)

          return (
            <div key={date} className="flex items-center gap-2">
              <span
                className="text-[10px] w-6 shrink-0 text-right"
                style={{ color: '#999' }}
              >
                {d}/{m}
              </span>
              <div
                className="flex-1 rounded-[4px] overflow-hidden relative"
                style={{ height: 16, backgroundColor: '#f0eeea' }}
              >
                <div className="absolute left-0 top-0 h-full flex">
                  <div
                    style={{ width: `${pumpW}%`, backgroundColor: '#e8aab8' }}
                  />
                  <div
                    style={{ width: `${feedW}%`, backgroundColor: '#a8bce8' }}
                  />
                </div>
              </div>
              <span
                className="text-[10px] w-8 shrink-0"
                style={{ color: '#999' }}
              >
                {total > 0 ? total : '—'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: '#e8aab8' }}
          />
          <span className="text-[10px]" style={{ color: '#999' }}>
            Hút (ml)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: '#a8bce8' }}
          />
          <span className="text-[10px]" style={{ color: '#999' }}>
            Uống (ml)
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  initial,
  onClose,
  onSave,
}: {
  initial?: MilkRecord
  onClose: () => void
  onSave: (data: {
    type: RecordType
    amount: number
    side?: PumpSide
    note?: string
    recordedAt: string
    localDate: string
  }) => Promise<void>
}) {
  const [type, setType] = useState<RecordType>(initial?.type ?? 'pump')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [side, setSide] = useState<PumpSide>(initial?.side ?? 'both')
  const [note, setNote] = useState(initial?.note ?? '')
  const [recordedAt, setRecordedAt] = useState(() => {
    if (initial) {
      const dt = parseISO(initial.recordedAt)
      return `${format(dt, 'yyyy-MM-dd')}T${format(dt, 'HH:mm')}`
    }
    const now = new Date()
    return `${format(now, 'yyyy-MM-dd')}T${format(now, 'HH:mm')}`
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const ml = Number(amount)
    if (!amount || isNaN(ml) || ml <= 0) {
      toast.error('Nhập số ml hợp lệ')
      return
    }
    setSaving(true)
    try {
      const dt = new Date(recordedAt)
      await onSave({
        type,
        amount: Math.round(ml),
        side: type === 'pump' ? side : undefined,
        note: note.trim() || undefined,
        recordedAt: dt.toISOString(),
        localDate: format(dt, 'yyyy-MM-dd'),
      })
      onClose()
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px] bg-white p-5"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div
          className="w-8 h-1 rounded-full mx-auto mb-4"
          style={{ backgroundColor: '#e0ddd8' }}
        />
        <h2
          className="text-[15px] font-medium mb-4"
          style={{ color: '#1a1a1a' }}
        >
          {initial ? 'Chỉnh sửa' : 'Ghi chép mới'}
        </h2>

        {/* Type */}
        <div className="mb-4">
          <div className="text-[11px] mb-1.5" style={{ color: '#999' }}>
            Loại
          </div>
          <div
            className="flex rounded-[10px] p-1"
            style={{ backgroundColor: '#f0eeea' }}
          >
            {(
              [
                ['pump', 'Hút sữa'],
                ['feed', 'Bé uống'],
              ] as [RecordType, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="flex-1 rounded-[8px] py-2 text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: type === t ? '#fff' : 'transparent',
                  color:
                    type === t ? (t === 'pump' ? PINK : BLUE) : '#999',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="text-[11px] mb-1.5" style={{ color: '#999' }}>
            Số ml
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="VD: 120"
            className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none"
            style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
          />
        </div>

        {/* Time */}
        <div className="mb-4">
          <div className="text-[11px] mb-1.5" style={{ color: '#999' }}>
            Thời gian
          </div>
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="w-full rounded-[10px] px-3 py-2.5 text-[13px] outline-none"
            style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
          />
        </div>

        {/* Side (pump only) */}
        {type === 'pump' && (
          <div className="mb-4">
            <div className="text-[11px] mb-1.5" style={{ color: '#999' }}>
              Bên hút
            </div>
            <div className="flex gap-2">
              {(
                [
                  ['left', 'Trái'],
                  ['right', 'Phải'],
                  ['both', 'Hai bên'],
                ] as [PumpSide, string][]
              ).map(([s, label]) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className="flex-1 rounded-[20px] py-2 text-[12px] transition-colors"
                  style={{
                    backgroundColor: side === s ? PINK_BG : '#f7f6f3',
                    color: side === s ? PINK : '#999',
                    border:
                      side === s
                        ? `1px solid ${PINK}`
                        : '1px solid #e8e6e1',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-5">
          <div className="text-[11px] mb-1.5" style={{ color: '#999' }}>
            Ghi chú
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuỳ chọn..."
            rows={2}
            className="w-full rounded-[10px] px-3 py-2.5 text-[13px] outline-none resize-none"
            style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-[14px] text-[14px] font-medium text-white"
          style={{ backgroundColor: PINK, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SumyPage() {
  const today = useMemo(() => todayStr(), [])
  const [allRecords, setAllRecords] = useState<MilkRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7))
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MilkRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await fetchRecords()
      setAllRecords(data)
    } catch {
      toast.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const todaySummary = useMemo(
    () => computeSummary(filterByDate(allRecords, today)),
    [allRecords, today],
  )
  const selectedRecords = useMemo(
    () => filterByDate(allRecords, selectedDate),
    [allRecords, selectedDate],
  )
  const todayRecords = useMemo(
    () => filterByDate(allRecords, today),
    [allRecords, today],
  )
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])

  const handleSave = async (data: Parameters<typeof createRecord>[0]) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data)
      toast.success('Đã cập nhật')
      setEditingRecord(null)
    } else {
      await createRecord(data)
      toast.success('Đã lưu')
    }
    await load()
  }

  const handleEdit = (record: MilkRecord) => {
    setEditingRecord(record)
  }

  const handleDelete = async (id: string) => {
    await deleteRecord(id)
    toast.success('Đã xóa')
    await load()
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    setCurrentMonth(date.slice(0, 7))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-[13px]" style={{ color: '#999' }}>
          Đang tải...
        </span>
      </div>
    )
  }

  return (
    <>
      <V2Topbar
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: PINK }}
          >
            <Plus size={16} color="#fff" />
          </button>
        }
      />

      <div className="max-w-[390px] mx-auto px-4 py-4">
        <div className="text-[11px] mb-3 capitalize" style={{ color: '#999' }}>
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: vi })}
        </div>

        <StatsRow summary={todaySummary} />

        {/* Quick-add */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 rounded-[12px] py-3 mb-3 transition-opacity active:opacity-70"
          style={{ backgroundColor: PINK_BG, border: `1px dashed ${PINK}` }}
        >
          <Plus size={14} color={PINK} />
          <span className="text-[13px] font-medium" style={{ color: PINK }}>
            Ghi chép mới
          </span>
        </button>

        <ViewToggle mode={viewMode} onChange={setViewMode} />

        {viewMode === 'week' ? (
          <WeekStrip
            weekDates={weekDates}
            selectedDate={selectedDate}
            today={today}
            records={allRecords}
            onSelect={handleSelectDate}
          />
        ) : (
          <MonthCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            today={today}
            records={allRecords}
            onSelect={handleSelectDate}
            onMonthChange={setCurrentMonth}
          />
        )}

        <Legend />
        <DetailCard date={selectedDate} records={selectedRecords} />

        <div className="text-[11px] mb-2" style={{ color: '#999' }}>
          Nhật ký hôm nay
        </div>
        <Log records={todayRecords} onEdit={handleEdit} onDelete={handleDelete} />

        <Chart allRecords={allRecords} today={today} />
      </div>

      {(showModal || editingRecord) && (
        <Modal
          initial={editingRecord ?? undefined}
          onClose={() => { setShowModal(false); setEditingRecord(null) }}
          onSave={handleSave}
        />
      )}
    </>
  )
}
