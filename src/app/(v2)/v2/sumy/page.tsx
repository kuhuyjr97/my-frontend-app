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
import { Plus, Droplets, Baby, Utensils, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react'
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
import { useLang } from '@/lib/v2/i18n/context'

// ─── constants ────────────────────────────────────────────────────────────────

const PINK = '#c97a8a'
const BLUE = '#4a72b0'
const GREEN = '#4a8a4a'
const ORANGE = '#c87a20'
const PINK_BG = '#fbeaf0'
const BLUE_BG = '#e8f0fb'
const ORANGE_BG = '#fef4e2'
const MINT = '#2a9d6e'
const MINT_BG = '#e8f8f2'
const LAVENDER = '#7b5ea7'
const LAVENDER_BG = '#f3edfb'


const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

interface DailySummary {
  pumpTotal: number
  pumpTimes: number
  feedTotal: number
  feedTimes: number
  eatTotal: number
  eatTimes: number
  balance: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function computeSummary(records: MilkRecord[]): DailySummary {
  const pump = records.filter((r) => r.type === 'pump')
  const feed = records.filter((r) => r.type === 'feed')
  const eat  = records.filter((r) => r.type === 'eat')
  return {
    pumpTotal: Math.round(pump.reduce((s, r) => s + r.amount, 0)),
    pumpTimes: pump.length,
    feedTotal: Math.round(feed.reduce((s, r) => s + r.amount, 0)),
    feedTimes: feed.length,
    eatTotal:  Math.round(eat.reduce((s, r) => s + r.amount, 0)),
    eatTimes:  eat.length,
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
        <button onClick={prevMonth} className="p-1" style={{ color: 'var(--v-text-3)' }}>
          <ChevronLeft size={16} />
        </button>
        <span
          className="text-[12px] font-medium capitalize"
          style={{ color: 'var(--v-text)' }}
        >
          {monthLabel}
        </span>
        <button onClick={nextMonth} className="p-1" style={{ color: 'var(--v-text-3)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px]"
            style={{ color: 'var(--v-text-3)' }}
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
                backgroundColor: !inMonth || !hasData ? 'var(--v-bg)' : 'var(--v-surface)',
                border: isSelected
                  ? '1px solid var(--v-text)'
                  : isToday
                    ? `1px solid ${PINK}`
                    : '0.5px solid var(--v-border)',
                opacity: !inMonth ? 0.3 : 1,
              }}
            >
              <div
                className="text-[10px] font-medium text-center mb-0.5"
                style={{ color: isToday ? PINK : 'var(--v-text)' }}
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
                  {sum.eatTotal > 0 && (
                    <div className="flex items-center gap-[2px]">
                      <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, backgroundColor: ORANGE }} />
                      <span className="text-[9px]" style={{ color: '#666' }}>{sum.eatTotal}</span>
                    </div>
                  )}
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

// ─── DayPopup ─────────────────────────────────────────────────────────────────

function DayPopup({
  date,
  records,
  today,
  onClose,
  onEdit,
  onDelete,
}: {
  date: string
  records: MilkRecord[]
  today: string
  onClose: () => void
  onEdit: (r: MilkRecord) => void
  onDelete: (id: string) => void
}) {
  const { t } = useLang()
  const dateLabel = format(parseISO(date), "EEEE, d/M/yyyy", { locale: vi })
  const sum = computeSummary(records)
  const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-[20px] sm:rounded-[18px] overflow-hidden shadow-xl"
        style={{ maxHeight: '80dvh', border: '1px solid var(--v-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
          <div>
            <div className="text-[13px] font-medium capitalize" style={{ color: 'var(--v-text)' }}>{dateLabel}</div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px]" style={{ color: PINK }}>↑ {sum.pumpTotal} ml</span>
              <span className="text-[11px]" style={{ color: BLUE }}>↓ {sum.feedTotal} ml</span>
              <span className="text-[11px]" style={{ color: sum.balance >= 0 ? '#4a8a4a' : PINK }}>
                {sum.balance >= 0 ? '+' : ''}{sum.balance} ml
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#f0eeea]">
            <X size={16} style={{ color: 'var(--v-text-3)' }} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80dvh - 72px)' }}>
          {sorted.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px]" style={{ color: 'var(--v-muted)' }}>
              <DayPopupEmpty date={date} today={today} />
            </div>
          ) : (
            sorted.map((rec) => {
              const isPump = rec.type === 'pump'
              const isEat  = rec.type === 'eat'
              const time = format(parseISO(rec.recordedAt), 'HH:mm')
              const label = isPump
                ? rec.entryKind === 'pump_dual'
                  ? `${t('sumy.pump')} · ${t('sumy.leftSide')} ${rec.leftMl ?? '—'} · ${t('sumy.rightSide')} ${rec.rightMl ?? '—'}`
                  : `${t('sumy.pumpOption')}${rec.side ? ` · ${rec.side === 'left' ? t('sumy.leftSide') : rec.side === 'right' ? t('sumy.rightSide') : t('sumy.bothSides')}` : ''}`
                : isEat ? t('sumy.eatOption') : t('sumy.feedOption')
              const recColor = isPump ? PINK : isEat ? ORANGE : BLUE
              return (
                <div
                  key={rec.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onEdit(rec); onClose() }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onEdit(rec); onClose() } }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#faf9f7] transition-colors cursor-pointer"
                  style={{ borderBottom: '0.5px solid #f0eeea' }}
                >
                  <span className="text-[11px] w-9 shrink-0" style={{ color: 'var(--v-text-3)' }}>{time}</span>
                  <div
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isPump ? PINK_BG : isEat ? ORANGE_BG : BLUE_BG }}
                  >
                    {isPump ? <Droplets size={13} color={recColor} /> : isEat ? <Utensils size={13} color={recColor} /> : <Baby size={13} color={recColor} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px]" style={{ color: 'var(--v-text)' }}>{label}</div>
                    {rec.note && <div className="text-[10px] truncate" style={{ color: 'var(--v-text-3)' }}>{rec.note}</div>}
                  </div>
                  <span className="text-[13px] font-medium shrink-0" style={{ color: recColor }}>
                    {rec.amount}ml
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(rec.id) }}
                    className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-[#fbeaea] shrink-0"
                  >
                    <Trash2 size={12} color="#c97a8a" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function DayPopupEmpty({ date, today }: { date: string; today: string }) {
  const { t } = useLang()
  return <>{date === today ? t('sumy.noRecordsToday') : t('sumy.noRecordsDate')}</>
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const { t } = useLang()
  return (
    <div className="flex items-center gap-4 mb-3">
      {[
        { color: '#e8aab8', label: t('sumy.pump') },
        { color: '#a8bce8', label: t('sumy.feed') },
        { color: '#f5c98a', label: t('sumy.eat') },
        { color: '#d0cdc8', label: t('sumy.surplus') },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1">
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: color }}
          />
          <span className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
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
  const { t } = useLang()
  const sum = computeSummary(records)
  const dateLabel = format(parseISO(date), "EEEE, d/M/yyyy", { locale: vi })
  const pos = sum.balance >= 0

  return (
    <div
      className="rounded-[16px] mb-3 overflow-hidden"
      style={{ border: '1px solid #f0dde8', boxShadow: '0 2px 16px rgba(201,122,138,0.10)' }}
    >
      {/* Gradient header */}
      <div
        className="px-[14px] py-[10px] flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${PINK_BG} 0%, ${BLUE_BG} 100%)` }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[15px]">📝</span>
          <span className="text-[12px] font-bold capitalize" style={{ color: PINK }}>
            {dateLabel}
          </span>
        </div>
        <span
          className="text-[11px] px-2 py-0.5 rounded-[20px] font-medium"
          style={{
            backgroundColor: pos ? '#e4f5e4' : '#ffe0e8',
            color: pos ? GREEN : PINK,
            border: `1px solid ${pos ? '#b0d8b0' : '#f0c0cc'}`,
          }}
        >
          {pos ? '+' : ''}
          {sum.balance} ml {pos ? t('sumy.surplus') : t('sumy.shortage')}
        </span>
      </div>
      {/* Stats */}
      <div className="p-[14px] bg-white">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets size={14} color={PINK} />
              <span className="text-[11px]" style={{ color: 'var(--v-text-3)' }}>
                {t('sumy.pumpedLabel')}
              </span>
            </div>
            <div className="text-[15px] font-medium" style={{ color: PINK }}>
              {sum.pumpTotal} ml
            </div>
            <div className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
              {sum.pumpTimes} lần ·{' '}
              {sum.pumpTimes > 0 ? Math.round(sum.pumpTotal / sum.pumpTimes) : 0} ml/lần
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Baby size={14} color={BLUE} />
              <span className="text-[11px]" style={{ color: 'var(--v-text-3)' }}>
                {t('sumy.babyFedLabel')}
              </span>
            </div>
            <div className="text-[15px] font-medium" style={{ color: BLUE }}>
              {sum.feedTotal} ml
            </div>
            <div className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
              {sum.feedTimes} lần ·{' '}
              {sum.feedTimes > 0 ? Math.round(sum.feedTotal / sum.feedTimes) : 0} ml/lần
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Utensils size={14} color={ORANGE} />
              <span className="text-[11px]" style={{ color: 'var(--v-text-3)' }}>
                {t('sumy.eatLabel')}
              </span>
            </div>
            <div className="text-[15px] font-medium" style={{ color: ORANGE }}>
              {sum.eatTotal} ml
            </div>
            <div className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
              {sum.eatTimes} lần ·{' '}
              {sum.eatTimes > 0 ? Math.round(sum.eatTotal / sum.eatTimes) : 0} ml/lần
            </div>
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

  const { t } = useLang()

  if (records.length === 0) {
    return (
      <div
        className="rounded-[14px] p-4 bg-white text-center"
        style={{ border: '0.5px solid #e8e6e1' }}
      >
        <span className="text-[12px]" style={{ color: 'var(--v-muted)' }}>
          {selectedDate === today ? t('sumy.noRecordsToday') : t('sumy.noRecordsDate')}
        </span>
      </div>
    )
  }

  const sorted = [...records].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  )

  return (
    <div
      className="rounded-[14px] bg-white overflow-hidden"
      style={{ border: '0.5px solid #e8e6e1' }}
    >
      {sorted.map((rec, i) => {
        const isPump = rec.type === 'pump'
        const isEat  = rec.type === 'eat'
        const time = format(parseISO(rec.recordedAt), 'HH:mm')
        const label = isPump
          ? rec.entryKind === 'pump_dual'
            ? `${t('sumy.pumpOption')} · ${t('sumy.leftSide')} ${rec.leftMl ?? '—'} · ${t('sumy.rightSide')} ${rec.rightMl ?? '—'}`
            : `${t('sumy.pumpOption')}${rec.side ? ` · ${rec.side === 'left' ? t('sumy.leftSide') : rec.side === 'right' ? t('sumy.rightSide') : t('sumy.bothSides')}` : ''}`
          : isEat ? t('sumy.eatOption') : t('sumy.feedOption')
        const recColor = isPump ? PINK : isEat ? ORANGE : BLUE
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
              <span className="text-[11px] w-9 shrink-0" style={{ color: 'var(--v-text-3)' }}>
                {time}
              </span>
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: isPump ? PINK_BG : isEat ? ORANGE_BG : BLUE_BG }}
              >
                {isPump ? <Droplets size={13} color={recColor} /> : isEat ? <Utensils size={13} color={recColor} /> : <Baby size={13} color={recColor} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] block" style={{ color: 'var(--v-text)' }}>
                  {label}
                </span>
                {rec.note && (
                  <span className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
                    {rec.note}
                  </span>
                )}
              </div>
              <span
                className="text-[13px] font-medium shrink-0"
                style={{ color: recColor }}
              >
                {rec.amount}ml
              </span>
            </button>

            {/* Inline actions */}
            {isSelected && (
              <div
                className="flex gap-2 px-3 pb-2.5"
                style={{ backgroundColor: 'var(--v-surface-2)' }}
              >
                <button
                  onClick={() => { onEdit(rec); setSelectedId(null) }}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium"
                  style={{ backgroundColor: 'var(--v-surface)', color: 'var(--v-text)', border: '0.5px solid #e8e6e1' }}
                >
                  {t('sumy.editRecord')}
                </button>
                <button
                  onClick={() => { onDelete(rec.id); setSelectedId(null) }}
                  className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium"
                  style={{ backgroundColor: PINK_BG, color: PINK }}
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── WeekChart ────────────────────────────────────────────────────────────────

function WeekChart({ allRecords, today }: { allRecords: MilkRecord[]; today: string }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const { t } = useLang()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return format(d, 'yyyy-MM-dd')
  })

  const data = days.map((date) => {
    const sum = computeSummary(filterByDate(allRecords, date))
    return { date, ...sum }
  })

  const maxVal = Math.max(...data.flatMap((d) => [d.pumpTotal, d.feedTotal, d.eatTotal]), 50)
  const BAR_H = 100

  const dow = (date: string) => {
    const d = parseISO(date)
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][getDay(d)]
  }

  const hoveredData = hovered ? data.find((d) => d.date === hovered) : null

  return (
    <div
      className="rounded-[16px] p-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fff8e8 0%, #fef3e0 100%)', border: '1px solid #f0d8a0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]">📈</span>
          <span className="text-[12px] font-bold" style={{ color: ORANGE }}>{t('sumy.last7Days')}</span>
        </div>
        <div className="flex items-center gap-3">
          {[
            { color: PINK,   label: t('sumy.pump') },
            { color: BLUE,   label: t('sumy.feed') },
            { color: ORANGE, label: t('sumy.eat') },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="rounded-full" style={{ width: 7, height: 7, backgroundColor: color }} />
              <span className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bars + labels */}
      <div className="flex gap-1" style={{ height: BAR_H + 22 }}>
        {/* Main chart area — full width */}
        <div className="relative flex-1 min-w-0">
          {/* Horizontal gridlines */}
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <div
              key={pct}
              className="absolute left-0 right-0 h-px pointer-events-none"
              style={{ bottom: 22 + pct * BAR_H, backgroundColor: 'var(--v-border-2)' }}
            />
          ))}
          {/* Columns */}
          <div className="absolute inset-0 flex gap-1">
            {data.map(({ date, pumpTotal, feedTotal, eatTotal }) => {
              const isToday = date === today
              const isHov   = hovered === date
              const bar = (val: number, color: string) => {
                const h = val > 0 ? Math.max(3, Math.round((val / maxVal) * BAR_H)) : 0
                return (
                  <div
                    className="flex-1 rounded-t-[3px] transition-all duration-150"
                    style={{ height: h, backgroundColor: color, opacity: isHov ? 1 : 0.75 }}
                  />
                )
              }
              return (
                <div
                  key={date}
                  className="flex-1 flex flex-col cursor-pointer"
                  onMouseEnter={() => setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="flex-1 flex items-end gap-px">
                    {bar(pumpTotal, PINK)}
                    {bar(feedTotal, BLUE)}
                    {bar(eatTotal, ORANGE)}
                  </div>
                  <div className="h-[22px] flex flex-col items-center justify-end pb-0.5">
                    <span className="text-[9px] leading-none font-medium" style={{ color: isToday ? PINK : 'var(--v-text-3)' }}>
                      {dow(date)}
                    </span>
                    <span className="text-[8px] leading-none" style={{ color: 'var(--v-faint)' }}>
                      {format(parseISO(date), 'd/M')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Y-axis labels — cột cố định bên phải */}
        <div className="relative shrink-0" style={{ width: 28, height: BAR_H + 22 }}>
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <span
              key={pct}
              className="absolute right-0 text-[9px] leading-none"
              style={{ bottom: 22 + pct * BAR_H - 5, color: 'var(--v-faint)' }}
            >
              {Math.round(maxVal * pct)}
            </span>
          ))}
        </div>
      </div>

      {/* Hover detail row */}
      <div
        className="mt-2 pt-2 flex items-center justify-between transition-opacity"
        style={{ borderTop: '1px solid var(--v-border-2)', opacity: hoveredData ? 1 : 0, minHeight: 22 }}
      >
        {hoveredData && (
          <>
            <span className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
              {format(parseISO(hoveredData.date), 'EEEE, d/M', { locale: vi })}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium" style={{ color: PINK }}>{t('sumy.pump')} {hoveredData.pumpTotal} ml</span>
              <span className="text-[11px] font-medium" style={{ color: BLUE }}>{t('sumy.feed')} {hoveredData.feedTotal} ml</span>
              {hoveredData.eatTotal > 0 && (
                <span className="text-[11px] font-medium" style={{ color: ORANGE }}>{t('sumy.eat')} {hoveredData.eatTotal} ml</span>
              )}
              <span className="text-[11px]" style={{ color: hoveredData.balance >= 0 ? GREEN : PINK }}>
                {hoveredData.balance >= 0 ? '+' : ''}{hoveredData.balance} ml
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── CompareCard ──────────────────────────────────────────────────────────────

function CompareCard({ allRecords, today }: { allRecords: MilkRecord[]; today: string }) {
  const yesterday = (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return format(d, 'yyyy-MM-dd')
  })()

  const todaySum = computeSummary(filterByDate(allRecords, today))
  const yestSum  = computeSummary(filterByDate(allRecords, yesterday))
  const hasYest  = filterByDate(allRecords, yesterday).length > 0

  const rows = [
    { label: 'Mẹ hút được', icon: '🩷', todayVal: todaySum.pumpTotal, yestVal: yestSum.pumpTotal, color: PINK, bg: PINK_BG },
    { label: 'Su uống được', icon: '💙', todayVal: todaySum.feedTotal, yestVal: yestSum.feedTotal, color: BLUE, bg: BLUE_BG },
    { label: 'Ăn được', icon: '🟠', todayVal: todaySum.eatTotal, yestVal: yestSum.eatTotal, color: ORANGE, bg: ORANGE_BG },
  ]

  return (
    <div
      className="rounded-[16px] mb-3 overflow-hidden"
      style={{ border: '1px solid #ddd0f0', boxShadow: '0 2px 16px rgba(123,94,167,0.08)' }}
    >
      <div
        className="px-[14px] py-[10px] flex items-center gap-2"
        style={{ background: `linear-gradient(135deg, ${LAVENDER_BG} 0%, #fce8f8 100%)` }}
      >
        <span className="text-[15px]">📊</span>
        <span className="text-[12px] font-bold" style={{ color: LAVENDER }}>
          So sánh với hôm qua
        </span>
      </div>
      <div className="p-[14px] bg-white">
        <div className="grid grid-cols-3 gap-2">
          {rows.map(({ label, icon, todayVal, yestVal, color, bg }) => {
            const diff = todayVal - yestVal
            const pos  = diff > 0
            const zero = diff === 0
            return (
              <div key={label} className="rounded-[12px] p-3 text-center" style={{ backgroundColor: bg }}>
                <div className="text-[18px] mb-1">{icon}</div>
                <div className="text-[9px] font-medium mb-1.5" style={{ color: 'var(--v-text-3)' }}>{label}</div>
                <div className="text-[16px] font-bold leading-none" style={{ color }}>{todayVal}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--v-text-3)' }}>ml</div>
                <div
                  className="mt-2 text-[9px] font-semibold"
                  style={{ color: !hasYest ? '#ccc' : zero ? '#aaa' : pos ? GREEN : '#e05555' }}
                >
                  {!hasYest ? '— chưa có dữ liệu' : zero ? '= hôm qua' : pos ? `▲ +${diff} ml` : `▼ ${diff} ml`}
                </div>
              </div>
            )
          })}
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
  const { t } = useLang()
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
        toast.error(t('sumy.pumpRequiredError'))
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
        toast.error(t('sumy.saveError'))
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
        toast.error(t('sumy.pumpRequiredError'))
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
        toast.error(t('sumy.saveError'))
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
        toast.error(t('sumy.pumpRequiredError'))
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
        toast.error(t('sumy.saveError'))
      } finally {
        setSaving(false)
      }
      return
    }

    // —— Bé uống / Ăn cháo (tạo / sửa) ——————————————————————————————
    const ml = Number(amount)
    if (!amount || isNaN(ml) || ml <= 0) {
      toast.error(t('sumy.invalidAmountError'))
      return
    }
    setSaving(true)
    try {
      await onSave({
        type,
        amount: Math.round(ml),
        note: noteTrim,
        recordedAt: recordedAtIso,
        localDate,
      })
      onClose()
    } catch {
      toast.error(t('sumy.saveError'))
    } finally {
      setSaving(false)
    }
  }

  /** Hai cột Trái/Phải khi loại Hút (tạo mới + chỉnh sửa) */
  const showPumpDualFields = type === 'pump'
  const isSaveDualLabel = type === 'pump' && (!isEdit || initial?.entryKind === 'pump_dual')
  const amountLabel = type === 'eat' ? t('sumy.eatAmountLabel') : t('sumy.amountLabel')

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px] p-5 transition-colors duration-200"
        style={{
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: type === 'pump' ? '#fef5f7' : type === 'eat' ? '#fef8f0' : '#f4f8fe',
        }}
      >
        <div
          className="w-8 h-1 rounded-full mx-auto mb-4"
          style={{ backgroundColor: '#e0ddd8' }}
        />
        <h2
          className="text-[15px] font-medium mb-1"
          style={{ color: 'var(--v-text)' }}
        >
          {initial ? t('sumy.editRecord') : t('sumy.newRecord')}
        </h2>
        {!isEdit && type === 'pump' && (
          <p className="text-[11px] mb-4" style={{ color: 'var(--v-text-3)' }}>
            Trái và phải lưu chung một dòng nhật ký (một bản ghi JSON).
          </p>
        )}
        {isEdit && type === 'pump' && initial?.entryKind === 'pump_dual' && (
          <p className="text-[11px] mb-4" style={{ color: 'var(--v-text-3)' }}>
            Sửa ml trái/phải trong cùng một ghi chép.
          </p>
        )}
        {isEdit && type === 'pump' && initial?.entryKind !== 'pump_dual' && (
          <p className="text-[11px] mb-4" style={{ color: 'var(--v-text-3)' }}>
            Một dòng chỉ lưu một mức ml mỗi bên — hai ô cùng số là hút hai bên; trái/phải khác số thì xóa dòng và ghi chép mới.
          </p>
        )}

        {/* Type */}
        <div className="mb-4">
          <div className="text-[11px] mb-1.5" style={{ color: 'var(--v-text-3)' }}>
            Loại
          </div>
          <div className="flex gap-2">
            {(
              [
                { rt: 'pump' as RecordType, label: t('sumy.pumpOption'), emoji: '🩷', color: PINK,   bg: '#fce0ea', border: '#f0a8be' },
                { rt: 'feed' as RecordType, label: t('sumy.feedOption'), emoji: '💙', color: BLUE,   bg: '#d8e8fa', border: '#90b8e8' },
                { rt: 'eat'  as RecordType, label: t('sumy.eatOption'),  emoji: '🟠', color: ORANGE, bg: '#fde4b8', border: '#f0b860' },
              ]
            ).map(({ rt, label, emoji, color, bg, border }) => (
              <button
                key={rt}
                type="button"
                onClick={() => {
                  setType(rt)
                  if (rt === 'feed' || rt === 'eat') {
                    setLeftMl('')
                    setRightMl('')
                  } else {
                    setAmount('')
                  }
                }}
                className="flex-1 rounded-[12px] py-3 text-[12px] font-bold transition-all flex flex-col items-center gap-0.5"
                style={{
                  backgroundColor: bg,
                  color,
                  border: type === rt ? `2px solid ${border}` : '2px solid transparent',
                  boxShadow: type === rt ? `0 3px 10px ${color}35` : 'none',
                  transform: type === rt ? 'translateY(-2px)' : 'none',
                }}
              >
                <span className="text-[16px] leading-none">{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pump: Trái + Phải (tạo mới & chỉnh sửa) */}
        {showPumpDualFields ? (
          <div className="mb-4">
            <div className="text-[11px] mb-2" style={{ color: 'var(--v-text-3)' }}>
              {t('sumy.pumpedAmount')}
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
                  {t('sumy.leftLabel')}
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={leftMl}
                    onChange={(e) => setLeftMl(e.target.value)}
                    placeholder="—"
                    className="w-full min-w-0 rounded-[10px] px-3 py-2.5 text-[20px] font-semibold outline-none bg-white/90"
                    style={{ border: '1px solid #f0d8df', color: 'var(--v-text)' }}
                  />
                  <span className="text-[12px] shrink-0" style={{ color: 'var(--v-text-3)' }}>
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
                  {t('sumy.rightLabel')}
                </div>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={rightMl}
                    onChange={(e) => setRightMl(e.target.value)}
                    placeholder="—"
                    className="w-full min-w-0 rounded-[10px] px-3 py-2.5 text-[20px] font-semibold outline-none bg-white/90"
                    style={{ border: '1px solid #d8e4f6', color: 'var(--v-text)' }}
                  />
                  <span className="text-[12px] shrink-0" style={{ color: 'var(--v-text-3)' }}>
                    ml
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Amount — một lần (bé uống / ăn cháo / chỉnh sửa hút) */
          <div className="mb-4">
            <div className="text-[11px] mb-1.5" style={{ color: 'var(--v-text-3)' }}>
              {amountLabel}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="VD: 120"
              className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
            />
          </div>
        )}

        {/* Time */}
        <div className="mb-4">
          <div className="text-[11px] mb-1.5" style={{ color: 'var(--v-text-3)' }}>
            {t('sumy.timeLabel')}
          </div>
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="w-full rounded-[10px] px-3 py-2.5 text-[13px] outline-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
          />
        </div>

        {/* Note */}
        <div className="mb-5">
          <div className="text-[11px] mb-1.5" style={{ color: 'var(--v-text-3)' }}>
            {t('sumy.noteLabel')}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('sumy.notePlaceholder')}
            rows={2}
            className="w-full rounded-[10px] px-3 py-2.5 text-[13px] outline-none resize-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
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
            ? t('common.saving')
            : isSaveDualLabel
              ? t('sumy.saveRecord')
              : t('common.save')}
        </button>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SumyPage() {
  const router = useRouter()
  const { t } = useLang()
  const today = useMemo(() => todayStr(), [])
  const [allRecords, setAllRecords] = useState<MilkRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7))
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MilkRecord | null>(null)
  const [dayPopup, setDayPopup] = useState<string | null>(null)
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
      toast.error(t('sumy.loadError'))
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
      toast.success(t('sumy.updated'))
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
      toast.success(t('sumy.saved'))
    } else if (data.type === 'pump' && data.amount != null) {
      await createRecord({
        type: 'pump',
        amount: data.amount,
        side: data.side,
        note: data.note,
        recordedAt: data.recordedAt,
        localDate: data.localDate,
      })
      toast.success(t('sumy.saved'))
    } else if (data.type === 'eat' && data.amount != null) {
      await createRecord({
        type: 'eat',
        amount: data.amount,
        note: data.note,
        recordedAt: data.recordedAt,
        localDate: data.localDate,
      })
      toast.success(t('sumy.saved'))
    } else if (data.type === 'feed' && data.amount != null) {
      await createRecord({
        type: 'feed',
        amount: data.amount,
        note: data.note,
        recordedAt: data.recordedAt,
        localDate: data.localDate,
      })
      toast.success(t('sumy.saved'))
    }
    await load()
  }

  const handleEdit = (record: MilkRecord) => {
    setEditingRecord(record)
  }

  const handleDelete = async (id: string) => {
    await deleteRecord(id)
    toast.success(t('sumy.deleted'))
    await load()
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    setCurrentMonth(date.slice(0, 7))
    setDayPopup(date)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-[13px]" style={{ color: 'var(--v-text-3)' }}>
          {t('common.loading')}
        </span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#edf5f0' }}>
      <V2Topbar />

      {/* ── Laptop: 2 cột | Mobile: 1 cột ── */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 max-w-[900px] mx-auto pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))]">
        <div className="text-[11px] mb-3 capitalize" style={{ color: 'var(--v-text-3)' }}>
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: vi })}
        </div>

        {/* Chart — desktop: trên hai cột; mobile: ẩn ở đây */}
        <div className="hidden sm:block mb-5">
          <WeekChart allRecords={allRecords} today={today} />
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-5 sm:items-start">

          {/* Cột trái — detail + log (+ chart mobile ở dưới log) */}
          <div className="sm:flex-1 sm:min-w-0">
            <DetailCard date={selectedDate} records={selectedRecords} />
            <CompareCard allRecords={allRecords} today={today} />

            {/* Log section — container */}
            <div
              className="rounded-[16px] mb-3 overflow-hidden"
              style={{ border: '1px solid #dce8f8', boxShadow: '0 2px 16px rgba(74,114,176,0.08)' }}
            >
              <div
                className="px-[14px] py-[10px] flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${BLUE_BG} 0%, #ecf4fd 100%)` }}
              >
                <span className="text-[15px]">🗒️</span>
                <span className="text-[12px] font-bold" style={{ color: BLUE }}>
                  {selectedDate === today
                    ? t('sumy.todayLog')
                    : `${t('sumy.todayLog')} · ${format(parseISO(selectedDate), 'EEEE, d/M/yyyy', { locale: vi })}`}
                </span>
              </div>
              <div className="p-3">
                <Log
                  records={selectedRecords}
                  selectedDate={selectedDate}
                  today={today}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </div>

            {/* Chart — mobile only, sau log trước lịch */}
            <div className="sm:hidden mt-5">
              <WeekChart allRecords={allRecords} today={today} />
            </div>
          </div>

          {/* Cột phải — calendar */}
          <div className="sm:w-[340px] sm:shrink-0 mt-5 sm:mt-0">
            <div
              className="rounded-[16px] overflow-hidden"
              style={{
                border: '1px solid #b8e8d0',
                boxShadow: '0 2px 16px rgba(45,157,110,0.10)',
              }}
            >
              {/* Calendar header */}
              <div
                className="px-4 py-[10px] flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${MINT_BG} 0%, #d8f5e8 100%)` }}
              >
                <span className="text-[15px]">📅</span>
                <span className="text-[12px] font-bold" style={{ color: MINT }}>
                  Lịch theo dõi
                </span>
              </div>
              <div className="p-4" style={{ backgroundColor: 'var(--v-surface-2)' }}>
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
          </div>

        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed right-6 z-40 bottom-[76px] sm:bottom-6 flex items-center gap-2 h-[44px] px-5 rounded-full text-[13px] font-medium shadow-lg"
        style={{ backgroundColor: MINT, color: '#fff' }}
      >
        <Plus size={16} />
        {t('sumy.newRecord')}
      </button>

      {dayPopup && (
        <DayPopup
          date={dayPopup}
          records={filterByDate(allRecords, dayPopup)}
          today={today}
          onClose={() => setDayPopup(null)}
          onEdit={(rec) => { setEditingRecord(rec); setDayPopup(null) }}
          onDelete={async (id) => { await handleDelete(id); setDayPopup(null) }}
        />
      )}

      {(showModal || editingRecord) && (
        <Modal
          initial={editingRecord ?? undefined}
          onClose={() => { setShowModal(false); setEditingRecord(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
