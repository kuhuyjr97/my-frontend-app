'use client'
import { useState, useMemo, useEffect } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { useLocalStorage, nanoid } from '@/lib/v2/storage'
import { SEED_TIMEBLOCKS } from '@/lib/v2/seed'
import type { TimeBlock, TimeCategory } from '@/lib/v2/types'

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<TimeCategory, { label: string; color: string; bg: string }> = {
  work:  { label: 'Work',  color: '#4a7c3f', bg: '#f0f5ee' },
  focus: { label: 'Focus', color: '#7040a0', bg: '#f5eefa' },
  break: { label: 'Break', color: '#a07030', bg: '#faf4ee' },
}

const GOAL_HOURS = 8

// ─── helpers ─────────────────────────────────────────────────────────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function durationLabel(startTime: string, endTime: string): string {
  const mins = toMinutes(endTime) - toMinutes(startTime)
  if (mins <= 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function totalHours(blocks: TimeBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(0, toMinutes(b.endTime) - toMinutes(b.startTime)), 0) / 60
}

function fmtHours(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

// ─── sub-components ──────────────────────────────────────────────────────────

function TimeBlockItem({ block, onDelete }: { block: TimeBlock; onDelete: () => void }) {
  const meta = CATEGORY_META[block.category]
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[10px] group"
      style={{ backgroundColor: '#fff', border: '1px solid #e8e6e1' }}
    >
      <div className="text-[11px] font-medium shrink-0 w-24" style={{ color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>
        {block.startTime} – {block.endTime}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{block.label}</div>
      </div>
      <span
        className="text-[11px] px-2 py-0.5 rounded-[20px] shrink-0"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        {meta.label}
      </span>
      <span className="text-[11px] w-10 text-right shrink-0" style={{ color: '#bbb' }}>
        {durationLabel(block.startTime, block.endTime)}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
      >
        <Trash2 size={12} color="#ccc" />
      </button>
    </div>
  )
}

function DailySummary({ blocks }: { blocks: TimeBlock[] }) {
  const work = totalHours(blocks.filter((b) => b.category === 'work'))
  const focus = totalHours(blocks.filter((b) => b.category === 'focus'))
  const brk = totalHours(blocks.filter((b) => b.category === 'break'))
  const total = work + focus

  const pct = Math.min(100, Math.round((total / GOAL_HOURS) * 100))

  return (
    <div className="bg-white rounded-[14px] p-4 flex flex-col gap-4" style={{ border: '1px solid #e8e6e1' }}>
      <div className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>Daily Summary</div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px]" style={{ color: '#bbb' }}>Goal: {GOAL_HOURS}h</span>
          <span className="text-[11px] font-medium" style={{ color: '#1a1a1a' }}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full" style={{ backgroundColor: '#f0eeea' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#4a7c3f' : '#3a5fa0' }} />
        </div>
      </div>

      {/* Stats */}
      {[
        { label: 'Work', value: work, meta: CATEGORY_META.work },
        { label: 'Focus', value: focus, meta: CATEGORY_META.focus },
        { label: 'Break', value: brk, meta: CATEGORY_META.break },
      ].map(({ label, value, meta }) => (
        <div key={label} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
            <span className="text-[12px]" style={{ color: '#555' }}>{label}</span>
          </div>
          <span className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{fmtHours(value)}</span>
        </div>
      ))}

      <div className="pt-1" style={{ borderTop: '1px solid #f0eeea' }}>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium" style={{ color: '#555' }}>Total productive</span>
          <span className="text-[14px] font-medium" style={{ color: '#1a1a1a' }}>{fmtHours(total)}</span>
        </div>
      </div>
    </div>
  )
}

function QuickAddBar({ date, onAdd }: { date: string; onAdd: (b: TimeBlock) => void }) {
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<TimeCategory>('work')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  const handleAdd = () => {
    if (!label.trim()) return
    onAdd({ id: nanoid(), label, category, startTime, endTime, date })
    setLabel('')
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-[14px] px-4 py-3" style={{ border: '1px solid #e8e6e1' }}>
      <input
        value={label} onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Block label"
        className="flex-1 text-[13px] outline-none bg-transparent"
        style={{ color: '#1a1a1a' }}
      />
      <select
        value={category} onChange={(e) => setCategory(e.target.value as TimeCategory)}
        className="h-[28px] px-2 rounded-[6px] text-[11px] outline-none shrink-0"
        style={{ border: '1px solid #e8e6e1', backgroundColor: '#fff', color: '#555' }}
      >
        {(Object.entries(CATEGORY_META) as [TimeCategory, typeof CATEGORY_META[TimeCategory]][]).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
        className="h-[28px] px-2 rounded-[6px] text-[11px] outline-none"
        style={{ border: '1px solid #e8e6e1', color: '#555' }} />
      <span className="text-[11px]" style={{ color: '#bbb' }}>–</span>
      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
        className="h-[28px] px-2 rounded-[6px] text-[11px] outline-none"
        style={{ border: '1px solid #e8e6e1', color: '#555' }} />
      <button onClick={handleAdd}
        className="h-[28px] px-3 rounded-[6px] flex items-center gap-1 text-[12px] font-medium shrink-0"
        style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
        <Plus size={12} />
        Add
      </button>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function TimePage() {
  const [blocks, setBlocks] = useLocalStorage<TimeBlock[]>('v2-timeblocks', [])
  const [seeded, setSeeded] = useLocalStorage<boolean>('v2-timeblocks-seeded', false)
  const [currentDate, setCurrentDate] = useState(todayStr())

  useEffect(() => {
    if (!seeded && blocks.length === 0) {
      setBlocks(SEED_TIMEBLOCKS)
      setSeeded(true)
    }
  }, [seeded, blocks.length, setBlocks, setSeeded])

  const dayBlocks = useMemo(
    () => blocks.filter((b) => b.date === currentDate).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [blocks, currentDate]
  )

  const prevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(format(d, 'yyyy-MM-dd'))
  }
  const nextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(format(d, 'yyyy-MM-dd'))
  }

  const deleteBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id))
  const addBlock = (b: TimeBlock) => setBlocks((prev) => [...prev, b])

  const isToday = currentDate === todayStr()

  return (
    <>
      <V2Topbar />

      <div className="p-5 flex flex-col gap-4">
        {/* Date nav */}
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]">
            <ChevronLeft size={14} color="#555" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium" style={{ color: '#1a1a1a' }}>
              {format(parseISO(currentDate), 'EEEE, d MMMM yyyy', { locale: vi })}
            </span>
            {isToday && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-[20px]" style={{ backgroundColor: '#eef3fa', color: '#3a5fa0' }}>
                Today
              </span>
            )}
          </div>
          <button onClick={nextDay} className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f0eeea]">
            <ChevronRight size={14} color="#555" />
          </button>
          {!isToday && (
            <button onClick={() => setCurrentDate(todayStr())}
              className="h-[26px] px-2.5 rounded-[6px] text-[11px]"
              style={{ border: '1px solid #e8e6e1', color: '#555' }}>
              Go to today
            </button>
          )}
        </div>

        {/* Main layout */}
        <div className="flex gap-4 items-start">
          {/* Time block list */}
          <div className="flex-1 flex flex-col gap-2">
            {dayBlocks.length === 0 ? (
              <div className="bg-white rounded-[14px] p-10 text-center" style={{ border: '1px solid #e8e6e1' }}>
                <div className="text-[14px] font-medium mb-1" style={{ color: '#555' }}>No time blocks</div>
                <div className="text-[12px]" style={{ color: '#bbb' }}>Add blocks below to track your day</div>
              </div>
            ) : (
              dayBlocks.map((b) => (
                <TimeBlockItem key={b.id} block={b} onDelete={() => deleteBlock(b.id)} />
              ))
            )}

            {/* Quick add */}
            <QuickAddBar date={currentDate} onAdd={addBlock} />
          </div>

          {/* Summary sidebar */}
          <div className="w-[220px] shrink-0">
            <DailySummary blocks={dayBlocks} />
          </div>
        </div>
      </div>
    </>
  )
}
