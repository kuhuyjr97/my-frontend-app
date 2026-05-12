'use client'
import { useState, useEffect } from 'react'
import { Search, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { fetchTasks, type TaskRow } from '@/lib/v2/tasks-api'

// ─── constants ───────────────────────────────────────────────────────────────

const REPORT_COLS = [
  { id: 'todo',     label: 'Chưa làm',    color: '#888888', bg: 'var(--v-hover)' },
  { id: 'doing',    label: 'Đang làm',    color: '#3a5fa0', bg: '#eef3fa' },
  { id: 'stg',      label: 'Đã test STG', color: '#b07a20', bg: '#fef4e2' },
  { id: 'released', label: 'Đã release',  color: '#4a7c3f', bg: '#f0f5ee' },
]

type BoardMap = Record<string, TaskRow[]>

// ─── Task chip (left list) ────────────────────────────────────────────────────

function SourceCard({ task, onDragStart }: { task: TaskRow; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 rounded-[8px] px-3 py-2 cursor-grab active:cursor-grabbing select-none"
      style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
    >
      <GripVertical size={12} style={{ color: 'var(--v-faint)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate" style={{ color: 'var(--v-text)' }}>{task.title}</div>
        {task.typeEnum?.content && (
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-text-3)' }}>{task.typeEnum.content}</div>
        )}
      </div>
    </div>
  )
}

// ─── Board card (right columns) ──────────────────────────────────────────────

function BoardCard({ task, colId, onDragStart, onRemove }: {
  task: TaskRow
  colId: string
  onDragStart: () => void
  onRemove: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-start gap-2 rounded-[8px] px-3 py-2.5 cursor-grab active:cursor-grabbing select-none"
      style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
    >
      <GripVertical size={12} style={{ color: 'var(--v-faint)', flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium leading-snug" style={{ color: 'var(--v-text)' }}>{task.title}</div>
        {task.typeEnum?.content && (
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-text-3)' }}>{task.typeEnum.content}</div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 mt-0.5 rounded p-0.5 transition-colors"
        style={{ color: 'var(--v-muted)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--v-text-2)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--v-muted)'}
      >
        <X size={11} />
      </button>
    </div>
  )
}

// ─── Report Column ────────────────────────────────────────────────────────────

function ReportColumn({ col, tasks, onDragOver, onDrop, onCardDragStart, onRemove }: {
  col: typeof REPORT_COLS[0]
  tasks: TaskRow[]
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onCardDragStart: (task: TaskRow) => void
  onRemove: (task: TaskRow) => void
}) {
  const [over, setOver] = useState(false)

  return (
    <div className="flex flex-col flex-1 min-w-[180px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
        <span className="text-[12px] font-medium" style={{ color: 'var(--v-text)' }}>{col.label}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full ml-0.5"
          style={{ backgroundColor: col.bg, color: col.color }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className="flex-1 rounded-[10px] p-2 flex flex-col gap-2 transition-colors"
        style={{
          border: `1.5px dashed ${over ? col.color : 'var(--v-border)'}`,
          backgroundColor: over ? col.bg + '60' : 'transparent',
          minHeight: 120,
        }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); onDragOver(e) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
        onDrop={(e) => { setOver(false); onDrop(e) }}
      >
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            colId={col.id}
            onDragStart={() => onCardDragStart(task)}
            onRemove={() => onRemove(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div
            className="flex-1 flex items-center justify-center text-[11px]"
            style={{ color: over ? col.color : 'var(--v-faint)' }}
          >
            {over ? 'Thả vào đây' : 'Kéo task vào đây'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [tasks, setTasks]     = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [showDone, setShowDone] = useState(false)
  const [board, setBoard]     = useState<BoardMap>({ todo: [], doing: [], stg: [], released: [] })
  const [dragging, setDragging] = useState<{ task: TaskRow; from: string } | null>(null)

  useEffect(() => {
    fetchTasks()
      .then((data) => setTasks(data))
      .catch(() => toast.error('Không tải được tasks'))
      .finally(() => setLoading(false))
  }, [])

  const boardIds = new Set(Object.values(board).flat().map((t) => t.id))
  const doneCount = tasks.filter((t) => !boardIds.has(t.id) && t.status === 'done').length

  const listTasks = tasks.filter((t) => {
    if (boardIds.has(t.id)) return false
    if (!showDone && t.status === 'done') return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDrop = (targetColId: string) => {
    if (!dragging) return
    const { task, from } = dragging

    setBoard((prev) => {
      const next: BoardMap = {}
      for (const col of REPORT_COLS) {
        // Remove from source column
        next[col.id] = from !== 'list' && col.id === from
          ? prev[col.id].filter((t) => t.id !== task.id)
          : [...prev[col.id]]
      }
      // Add to target if not already there
      if (!next[targetColId].find((t) => t.id === task.id)) {
        next[targetColId] = [...next[targetColId], task]
      }
      return next
    })
    setDragging(null)
  }

  const handleRemove = (task: TaskRow, colId: string) => {
    setBoard((prev) => ({ ...prev, [colId]: prev[colId].filter((t) => t.id !== task.id) }))
  }

  return (
    <>
      <V2Topbar />

      <div className="flex h-[calc(100vh-56px)] overflow-hidden">

        {/* ── Left: source list ─────────────────────────────────── */}
        <div
          className="w-[240px] shrink-0 flex flex-col"
          style={{ borderRight: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
        >
          <div className="px-3 py-3 shrink-0 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--v-text-3)' }}>DANH SÁCH TASK</div>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-1 text-[10px] px-2 h-[20px] rounded-[5px] transition-colors"
                style={{
                  border: '1px solid var(--v-border)',
                  color: showDone ? 'var(--v-text-2)' : 'var(--v-text-3)',
                  backgroundColor: showDone ? 'var(--v-hover)' : 'transparent',
                }}
              >
                {showDone ? 'Ẩn done' : `Hiện done${doneCount > 0 ? ` (${doneCount})` : ''}`}
              </button>
            </div>
            <div
              className="flex items-center gap-2 h-[30px] px-3 rounded-[7px]"
              style={{ border: '1px solid var(--v-border)' }}
            >
              <Search size={11} style={{ color: 'var(--v-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm…"
                className="flex-1 text-[12px] outline-none bg-transparent"
                style={{ color: 'var(--v-text)' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}>
                  <X size={10} style={{ color: 'var(--v-muted)' }} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {loading ? (
              <div className="py-8 text-center text-[12px]" style={{ color: 'var(--v-muted)' }}>Đang tải…</div>
            ) : listTasks.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: 'var(--v-faint)' }}>
                {tasks.length === 0
                  ? 'Không có task nào'
                  : !showDone && doneCount > 0
                    ? `Đang ẩn ${doneCount} task done`
                    : 'Tất cả task đã thêm vào báo cáo'}
              </div>
            ) : (
              listTasks.map((task) => (
                <SourceCard
                  key={task.id}
                  task={task}
                  onDragStart={() => setDragging({ task, from: 'list' })}
                />
              ))
            )}
          </div>

          {/* Stats */}
          <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--v-border-2)' }}>
            <div className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>
              {boardIds.size}/{tasks.length} task trong báo cáo
            </div>
          </div>
        </div>

        {/* ── Right: report board ───────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--v-text-3)' }}>
              BÁO CÁO TIẾN ĐỘ
            </span>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <div className="flex gap-4 h-full min-w-[600px]">
              {REPORT_COLS.map((col) => (
                <ReportColumn
                  key={col.id}
                  col={col}
                  tasks={board[col.id] ?? []}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.id)}
                  onCardDragStart={(task) => setDragging({ task, from: col.id })}
                  onRemove={(task) => handleRemove(task, col.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
