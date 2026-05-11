'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  format,
  parseISO,
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
import { getSessionUsername } from '@/lib/v2/auth-session'

// ─── constants ────────────────────────────────────────────────────────────────

const PINK = '#c97a8a'
const BLUE = '#4a72b0'
const GREEN = '#4a8a4a'
const PINK_BG = '#fbeaf0'
const BLUE_BG = '#e8f0fb'

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

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

/** Chuẩn hoá ngày nhật ký (ưu tiên `date` từ API = localDate khi lưu). */
function recordCalendarDay(r: MilkRecord): string {
  if (r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) return r.date
  try {
    return format(parseISO(r.recordedAt), 'yyyy-MM-dd')
  } catch {
    return r.date ?? ''
  }
}

function filterByDate(records: MilkRecord[], date: string): MilkRecord[] {
  return records.filter((r) => recordCalendarDay(r) === date)
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
    <div>
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
  selectedDate,
  today,
  onEdit,
  onDelete,
}: {
  records: MilkRecord[]
  selectedDate: string
  today: string
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
          {selectedDate === today
            ? 'Chưa có ghi chép hôm nay'
            : 'Chưa có ghi chép cho ngày này'}
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
        const label = !isPump
          ? 'Bé uống'
          : rec.entryKind === 'pump_dual'
            ? `Hút sữa · Trái ${rec.leftMl ?? '—'} · Phải ${rec.rightMl ?? '—'}`
            : `Hút sữa${rec.side ? ` · ${rec.side === 'left' ? 'Trái' : rec.side === 'right' ? 'Phải' : 'Hai bên'}` : ''}`
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
    amount?: number
    side?: PumpSide
    leftMl?: number
    rightMl?: number
    note?: string
    recordedAt: string
    localDate: string
  }) => Promise<void>
}) {
  const isEdit = !!initial
  const [type, setType] = useState<RecordType>(initial?.type ?? 'pump')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [leftMl, setLeftMl] = useState('')
  const [rightMl, setRightMl] = useState('')
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

  useEffect(() => {
    if (!initial) {
      setType('pump')
      setAmount('')
      setLeftMl('')
      setRightMl('')
      setNote('')
      const now = new Date()
      setRecordedAt(
        `${format(now, 'yyyy-MM-dd')}T${format(now, 'HH:mm')}`,
      )
      return
    }
    setType(initial.type)
    setNote(initial.note ?? '')
    const dt = parseISO(initial.recordedAt)
    setRecordedAt(`${format(dt, 'yyyy-MM-dd')}T${format(dt, 'HH:mm')}`)
    setAmount(String(initial.amount))
    if (initial.type === 'pump') {
      if (initial.entryKind === 'pump_dual') {
        setLeftMl(
          initial.leftMl != null ? String(initial.leftMl) : '',
        )
        setRightMl(
          initial.rightMl != null ? String(initial.rightMl) : '',
        )
      } else {
        setLeftMl('')
        setRightMl('')
        if (initial.side === 'left') setLeftMl(String(initial.amount))
        else if (initial.side === 'right')
          setRightMl(String(initial.amount))
        else if (initial.side === 'both') {
          setLeftMl(String(initial.amount))
          setRightMl(String(initial.amount))
        } else {
          setLeftMl(String(initial.amount))
        }
      }
    } else {
      setLeftMl('')
      setRightMl('')
    }
  }, [initial])

  const handleSave = async () => {
    const dt = new Date(recordedAt)
    const recordedAtIso = dt.toISOString()
    const localDate = format(dt, 'yyyy-MM-dd')
    const noteTrim = note.trim() || undefined

    // —— Tạo mới · Hút — một CustomRecord JSON (trái ± phải) ——————————
    if (!isEdit && type === 'pump') {
      const L = leftMl === '' ? NaN : Number(leftMl)
      const R = rightMl === '' ? NaN : Number(rightMl)
      const hasL = !isNaN(L) && L > 0
      const hasR = !isNaN(R) && R > 0
      if (!hasL && !hasR) {
        toast.error('Nhập ml ít nhất một bên (trái hoặc phải)')
        return
      }
      setSaving(true)
      try {
        await onSave({
          type: 'pump',
          leftMl: hasL ? Math.round(L) : undefined,
          rightMl: hasR ? Math.round(R) : undefined,
          note: noteTrim,
          recordedAt: recordedAtIso,
          localDate,
        })
        onClose()
      } catch {
        toast.error('Lỗi khi lưu')
      } finally {
        setSaving(false)
      }
      return
    }

    // —— Sửa · Hút · pump_dual (một dòng JSON) ——————————————————————
    if (isEdit && type === 'pump' && initial?.entryKind === 'pump_dual') {
      const L = leftMl === '' ? NaN : Number(leftMl)
      const R = rightMl === '' ? NaN : Number(rightMl)
      const hasL = !isNaN(L) && L > 0
      const hasR = !isNaN(R) && R > 0
      if (!hasL && !hasR) {
        toast.error('Nhập ml ít nhất một bên')
        return
      }
      setSaving(true)
      try {
        await onSave({
          type: 'pump',
          leftMl: hasL ? Math.round(L) : 0,
          rightMl: hasR ? Math.round(R) : 0,
          note: noteTrim,
          recordedAt: recordedAtIso,
          localDate,
        })
        onClose()
      } catch {
        toast.error('Lỗi khi lưu')
      } finally {
        setSaving(false)
      }
      return
    }

    // —— Sửa · Hút — pump_single (một mức ml) ———————————————————————
    if (isEdit && type === 'pump') {
      const L = leftMl === '' ? NaN : Number(leftMl)
      const R = rightMl === '' ? NaN : Number(rightMl)
      const hasL = !isNaN(L) && L > 0
      const hasR = !isNaN(R) && R > 0
      if (!hasL && !hasR) {
        toast.error('Nhập ml ít nhất một bên')
        return
      }
      if (hasL && hasR && Math.round(L) !== Math.round(R)) {
        toast.error(
          'Một dòng chỉ lưu một mức ml — khác trái/phải thì xóa dòng này và ghi chép mới (hai bên).',
        )
        return
      }
      let outAmount: number
      let outSide: PumpSide
      if (hasL && !hasR) {
        outAmount = Math.round(L)
        outSide = 'left'
      } else if (!hasL && hasR) {
        outAmount = Math.round(R)
        outSide = 'right'
      } else {
        outAmount = Math.round(L)
        outSide = 'both'
      }
      setSaving(true)
      try {
        await onSave({
          type: 'pump',
          amount: outAmount,
          side: outSide,
          note: noteTrim,
          recordedAt: recordedAtIso,
          localDate,
        })
        onClose()
      } catch {
        toast.error('Lỗi khi lưu')
      } finally {
        setSaving(false)
      }
      return
    }

    // —— Bé uống (tạo / sửa) ————————————————————————————————————————
    const ml = Number(amount)
    if (!amount || isNaN(ml) || ml <= 0) {
      toast.error('Nhập số ml hợp lệ')
      return
    }
    setSaving(true)
    try {
      await onSave({
        type: 'feed',
        amount: Math.round(ml),
        note: noteTrim,
        recordedAt: recordedAtIso,
        localDate,
      })
      onClose()
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  /** Hai cột Trái/Phải khi loại Hút (tạo mới + chỉnh sửa) */
  const showPumpDualFields = type === 'pump'
  const isSaveDualLabel = type === 'pump' && (!isEdit || initial?.entryKind === 'pump_dual')

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
          className="text-[15px] font-medium mb-1"
          style={{ color: '#1a1a1a' }}
        >
          {initial ? 'Chỉnh sửa' : 'Ghi chép mới'}
        </h2>
        {!isEdit && type === 'pump' && (
          <p className="text-[11px] mb-4" style={{ color: '#999' }}>
            Trái và phải lưu chung một dòng nhật ký (một bản ghi JSON).
          </p>
        )}
        {isEdit && type === 'pump' && initial?.entryKind === 'pump_dual' && (
          <p className="text-[11px] mb-4" style={{ color: '#999' }}>
            Sửa ml trái/phải trong cùng một ghi chép.
          </p>
        )}
        {isEdit && type === 'pump' && initial?.entryKind !== 'pump_dual' && (
          <p className="text-[11px] mb-4" style={{ color: '#999' }}>
            Một dòng chỉ lưu một mức ml mỗi bên — hai ô cùng số là hút hai bên; trái/phải khác số thì xóa dòng và ghi chép mới.
          </p>
        )}

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
                type="button"
                onClick={() => {
                  setType(t)
                  if (t === 'feed') {
                    setLeftMl('')
                    setRightMl('')
                  } else {
                    setAmount('')
                  }
                }}
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

        {/* Pump: Trái + Phải (tạo mới & chỉnh sửa) */}
        {showPumpDualFields ? (
          <div className="mb-4">
            <div className="text-[11px] mb-2" style={{ color: '#999' }}>
              Số ml đã hút
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-[14px] p-3"
                style={{
                  background: `linear-gradient(145deg, ${PINK_BG} 0%, #fff 100%)`,
                  border: `1px solid ${PINK}`,
                  boxShadow: '0 2px 12px rgba(201,122,138,0.12)',
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: PINK }}>
                  Trái — L
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={leftMl}
                    onChange={(e) => setLeftMl(e.target.value)}
                    placeholder="—"
                    className="w-full min-w-0 rounded-[10px] px-3 py-2.5 text-[20px] font-semibold outline-none bg-white/90"
                    style={{ border: '1px solid #f0d8df', color: '#1a1a1a' }}
                  />
                  <span className="text-[12px] shrink-0" style={{ color: '#999' }}>
                    ml
                  </span>
                </div>
              </div>
              <div
                className="rounded-[14px] p-3"
                style={{
                  background: `linear-gradient(145deg, ${BLUE_BG} 0%, #fff 100%)`,
                  border: `1px solid ${BLUE}`,
                  boxShadow: '0 2px 12px rgba(74,114,176,0.12)',
                }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: BLUE }}>
                  Phải — R
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={rightMl}
                    onChange={(e) => setRightMl(e.target.value)}
                    placeholder="—"
                    className="w-full min-w-0 rounded-[10px] px-3 py-2.5 text-[20px] font-semibold outline-none bg-white/90"
                    style={{ border: '1px solid #d8e4f6', color: '#1a1a1a' }}
                  />
                  <span className="text-[12px] shrink-0" style={{ color: '#999' }}>
                    ml
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Amount — một lần (bé uống / chỉnh sửa hút) */
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
        )}

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
          className="w-full py-3 rounded-[14px] text-[14px] font-medium text-white shadow-sm"
          style={{ backgroundColor: PINK, opacity: saving ? 0.7 : 1 }}
        >
          {saving
            ? 'Đang lưu...'
            : isSaveDualLabel
              ? 'Lưu ghi chép'
              : 'Lưu'}
        </button>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SumyPage() {
  const router = useRouter()
  const today = useMemo(() => todayStr(), [])
  const [allRecords, setAllRecords] = useState<MilkRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7))
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MilkRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (getSessionUsername() !== 'sumy') {
      router.replace('/v2')
    }
  }, [router])

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

  const selectedRecords = useMemo(
    () => filterByDate(allRecords, selectedDate),
    [allRecords, selectedDate],
  )

  const handleSave = async (data: {
    type: RecordType
    amount?: number
    side?: PumpSide
    leftMl?: number
    rightMl?: number
    note?: string
    recordedAt: string
    localDate: string
  }) => {
    if (editingRecord) {
      if (editingRecord.entryKind === 'pump_dual' && data.type === 'pump') {
        await updateRecord(editingRecord.id, {
          leftMl: data.leftMl,
          rightMl: data.rightMl,
          note: data.note,
          recordedAt: data.recordedAt,
          localDate: data.localDate,
        })
      } else {
        await updateRecord(editingRecord.id, {
          amount: data.amount,
          side: data.side,
          note: data.note,
          recordedAt: data.recordedAt,
          localDate: data.localDate,
        })
      }
      toast.success('Đã cập nhật')
      setEditingRecord(null)
    } else if (
      data.type === 'pump' &&
      (data.leftMl !== undefined || data.rightMl !== undefined)
    ) {
      await createRecord({
        type: 'pump',
        leftMl: data.leftMl,
        rightMl: data.rightMl,
        note: data.note,
        recordedAt: data.recordedAt,
        localDate: data.localDate,
      })
      toast.success('Đã lưu')
    } else if (data.type === 'pump' && data.amount != null) {
      await createRecord({
        type: 'pump',
        amount: data.amount,
        side: data.side,
        note: data.note,
        recordedAt: data.recordedAt,
        localDate: data.localDate,
      })
      toast.success('Đã lưu')
    } else if (data.type === 'feed' && data.amount != null) {
      await createRecord({
        type: 'feed',
        amount: data.amount,
        note: data.note,
        recordedAt: data.recordedAt,
        localDate: data.localDate,
      })
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

        <DetailCard date={selectedDate} records={selectedRecords} />

        {/* Quick-add */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full rounded-[14px] mb-3 overflow-hidden transition-opacity active:opacity-85"
          style={{
            border: `1px solid ${PINK}`,
            boxShadow: '0 2px 14px rgba(201,122,138,0.15)',
          }}
        >
          <div className="flex items-stretch">
            <div
              className="flex-1 flex flex-col items-center justify-center py-3 px-2"
              style={{ backgroundColor: PINK_BG }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: PINK }}>
                Trái
              </span>
              <span className="text-[9px] mt-0.5" style={{ color: '#b08090' }}>
                ml
              </span>
            </div>
            <div
              className="flex flex-col items-center justify-center px-3 py-2.5 bg-white min-w-[120px]"
              style={{ borderLeft: `1px solid #f5e0e6`, borderRight: `1px solid #f5e0e6` }}
            >
              <Plus size={16} color={PINK} className="mb-0.5" />
              <span className="text-[12px] font-semibold leading-tight" style={{ color: '#1a1a1a' }}>
                Ghi chép mới
              </span>
              <span className="text-[9px] mt-0.5 text-center" style={{ color: '#999' }}>
                Trái &amp; phải cùng lúc
              </span>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center py-3 px-2"
              style={{ backgroundColor: BLUE_BG }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: BLUE }}>
                Phải
              </span>
              <span className="text-[9px] mt-0.5" style={{ color: '#7a90b0' }}>
                ml
              </span>
            </div>
          </div>
        </button>

        <div className="text-[11px] mb-2 capitalize" style={{ color: '#999' }}>
          {selectedDate === today
            ? 'Nhật ký hôm nay'
            : `Nhật ký · ${format(parseISO(selectedDate), 'EEEE, d/M/yyyy', { locale: vi })}`}
        </div>
        <Log
          records={selectedRecords}
          selectedDate={selectedDate}
          today={today}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div
          className="mt-5 rounded-[16px] p-4 mb-2"
          style={{
            backgroundColor: '#f5f3ef',
            border: '0.5px solid #e5e2dc',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          <Legend />
          <MonthCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            today={today}
            records={allRecords}
            onSelect={handleSelectDate}
            onMonthChange={setCurrentMonth}
          />
        </div>
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
