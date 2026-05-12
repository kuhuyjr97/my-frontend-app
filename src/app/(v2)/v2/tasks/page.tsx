'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, X, Circle, CheckCircle2, Trash2, Calendar, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { fetchTasks, createTask, updateTask, deleteTask, type TaskRow } from '@/lib/v2/tasks-api'
import { fetchTypes, type TypeEnumRow } from '@/lib/v2/types-api'

// ─── types ───────────────────────────────────────────────────────────────────

type TaskPatch = {
  title?: string
  content?: string | null
  status?: string
  dueTime?: string | null
  typeEnumId?: number | null
  progress?: number | null
  link?: string | null
}

// ─── constants ───────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'todo',       label: 'Cần làm',  color: '#bbbbbb', bg: 'var(--v-hover)' },
  { id: 'inprogress', label: 'Đang làm', color: '#3a5fa0', bg: '#eef3fa' },
  { id: 'done',       label: 'Xong',     color: '#4a7c3f', bg: '#f0f5ee' },
]

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ task, types, onUpdate, onDelete, onClose }: {
  task: TaskRow
  types: TypeEnumRow[]
  onUpdate: (patch: TaskPatch) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [title, setTitle]     = useState(task.title)
  const [content, setContent] = useState(task.content ?? '')
  const [link, setLink]       = useState(task.link ?? '')

  useEffect(() => {
    setTitle(task.title)
    setContent(task.content ?? '')
    setLink(task.link ?? '')
  }, [task.id])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="w-[300px] shrink-0 rounded-[14px] flex flex-col"
      style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)', height: 'calc(100vh - 56px - 40px)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
        <span className="text-[12px] font-medium" style={{ color: 'var(--v-text-2)' }}>Chi tiết</span>
        <button onClick={onClose}><X size={14} style={{ color: 'var(--v-muted)' }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Title */}
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== task.title && onUpdate({ title })}
          rows={2}
          className="w-full text-[14px] font-medium resize-none outline-none bg-transparent"
          style={{ color: 'var(--v-text)' }}
        />

        {/* Status & Type */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--v-muted)' }}>TRẠNG THÁI</div>
            <select
              value={task.status ?? 'todo'}
              onChange={(e) => onUpdate({ status: e.target.value })}
              className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
              style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
            >
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--v-muted)' }}>LOẠI</div>
            <select
              value={task.typeEnumId ?? ''}
              onChange={(e) => onUpdate({ typeEnumId: e.target.value ? Number(e.target.value) : null })}
              className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
              style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
            >
              <option value="">Không có</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.content}</option>)}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--v-muted)' }}>NGÀY HẾT HẠN</div>
          <input
            type="datetime-local"
            value={task.dueTime ? task.dueTime.slice(0, 16) : ''}
            onChange={(e) => onUpdate({ dueTime: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
            style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
          />
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-medium" style={{ color: 'var(--v-muted)' }}>TIẾN ĐỘ</div>
            <span className="text-[10px]" style={{ color: 'var(--v-text-3)' }}>{task.progress ?? 0}%</span>
          </div>
          <input
            type="range" min={0} max={100}
            value={task.progress ?? 0}
            onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            className="w-full accent-[#4a7c3f]"
          />
        </div>

        {/* Link */}
        <div>
          <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--v-muted)' }}>LINK</div>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onBlur={() => link !== (task.link ?? '') && onUpdate({ link: link || null })}
            placeholder="https://…"
            className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
          />
        </div>

        {/* Content */}
        <div>
          <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--v-muted)' }}>GHI CHÚ</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => content !== (task.content ?? '') && onUpdate({ content: content || null })}
            placeholder="Ghi chú…"
            rows={5}
            className="w-full rounded-[7px] px-3 py-2 text-[12px] resize-none outline-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
          />
        </div>
      </div>

      <div className="p-3" style={{ borderTop: '1px solid var(--v-border-2)' }}>
        <button
          onClick={onDelete}
          className="w-full h-[30px] rounded-[7px] flex items-center justify-center gap-1.5 text-[12px]"
          style={{ border: '1px solid var(--v-border)', color: '#b05040' }}
        >
          <Trash2 size={12} />
          Xóa task
        </button>
      </div>
    </div>
  )
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, selected, onSelect, onToggleDone }: {
  task: TaskRow
  selected: boolean
  onSelect: () => void
  onToggleDone: () => void
}) {
  const isDone    = task.status === 'done'
  const isOverdue = task.dueTime && !isDone && isPast(parseISO(task.dueTime))

  return (
    <div
      onClick={onSelect}
      className="rounded-[10px] p-3 cursor-pointer transition-all"
      style={{ border: selected ? '1.5px solid #3a5fa0' : '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone() }}
          className="mt-0.5 shrink-0"
        >
          {isDone
            ? <CheckCircle2 size={15} style={{ color: '#4a7c3f' }} />
            : <Circle      size={15} style={{ color: 'var(--v-faint)' }} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <div
            className="text-[12px] font-medium mb-1.5 leading-snug"
            style={{ color: isDone ? 'var(--v-muted)' : 'var(--v-text)', textDecoration: isDone ? 'line-through' : 'none' }}
          >
            {task.title}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {task.typeEnum?.content && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3a5fa018', color: '#3a5fa0' }}>
                {task.typeEnum.content}
              </span>
            )}
            {task.dueTime && (
              <div className="flex items-center gap-1">
                <Calendar size={10} style={{ color: isOverdue ? '#b05040' : 'var(--v-muted)' }} />
                <span className="text-[10px]" style={{ color: isOverdue ? '#b05040' : 'var(--v-muted)' }}>
                  {format(parseISO(task.dueTime), 'dd/MM', { locale: vi })}
                </span>
              </div>
            )}
            {task.link && (
              <a
                href={task.link} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center"
              >
                <ExternalLink size={10} style={{ color: 'var(--v-muted)' }} />
              </a>
            )}
          </div>
          {task.progress !== null && task.progress > 0 && (
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--v-hover)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${task.progress}%`, backgroundColor: '#4a7c3f' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, selectedId, onSelect, onAdd, onToggleDone }: {
  col: typeof COLUMNS[0]
  tasks: TaskRow[]
  selectedId: number | null
  onSelect: (id: number) => void
  onAdd: (status: string) => void
  onToggleDone: (id: number) => void
}) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
        <span className="text-[12px] font-medium" style={{ color: 'var(--v-text)' }}>{col.label}</span>
        <span className="text-[11px] px-1.5 rounded-full ml-0.5" style={{ backgroundColor: col.bg, color: col.color }}>
          {tasks.length}
        </span>
        <button
          onClick={() => onAdd(col.id)}
          className="ml-auto w-5 h-5 flex items-center justify-center rounded"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Plus size={12} style={{ color: 'var(--v-muted)' }} />
        </button>
      </div>
      <div className="flex flex-col gap-2 min-h-[60px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={selectedId === task.id}
            onSelect={() => onSelect(task.id)}
            onToggleDone={() => onToggleDone(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Add Task Modal ───────────────────────────────────────────────────────────

function AddTaskModal({ defaultStatus, types, onClose, onAdd }: {
  defaultStatus: string
  types: TypeEnumRow[]
  onClose: () => void
  onAdd: (t: TaskRow) => void
}) {
  const [title, setTitle]           = useState('')
  const [status, setStatus]         = useState(defaultStatus)
  const [typeEnumId, setTypeEnumId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const task = await createTask({ title: title.trim(), status, typeEnumId: typeEnumId ?? undefined })
      onAdd(task)
      onClose()
    } catch {
      toast.error('Không tạo được task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-[14px] w-[380px] shadow-xl" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
          <span className="text-[14px] font-medium" style={{ color: 'var(--v-text)' }}>Task mới</span>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--v-text-3)' }} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề task"
            className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Trạng thái</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
                style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}>
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {types.length > 0 && (
              <div className="flex-1">
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>Loại</label>
                <select value={typeEnumId ?? ''} onChange={(e) => setTypeEnumId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
                  style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}>
                  <option value="">Không có</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.content}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-[34px] rounded-[7px] text-[13px]"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)' }}>Hủy</button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-[34px] rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}>Tạo</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks]         = useState<TaskRow[]>([])
  const [taskTypes, setTaskTypes] = useState<TypeEnumRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState<number | null>(null)
  const [addStatus, setAddStatus]   = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchTasks()
      setTasks(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') toast.error('Phiên đăng nhập hết hạn')
      else toast.error('Không tải được tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    fetchTypes()
      .then((all) => setTaskTypes(all.filter((t) => t.type === 3)))
      .catch(() => {/* silent */})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  const filtered = tasks.filter((t) => typeFilter === null || t.typeEnumId === typeFilter)

  const handleUpdate = useCallback(async (id: number, patch: TaskPatch) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t))
    try {
      const updated = await updateTask(id, patch)
      setTasks((prev) => prev.map((t) => t.id === id ? updated : t))
    } catch {
      toast.error('Không cập nhật được')
      void load()
    }
  }, [load])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa task này?')) return
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch {
      toast.error('Không xóa được')
    }
  }

  const toggleDone = (id: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    void handleUpdate(id, { status: task.status === 'done' ? 'todo' : 'done' })
  }

  return (
    <>
      <V2Topbar actions={
        <button
          onClick={() => setAddStatus('todo')}
          className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
          style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
        >
          <Plus size={13} />
          Task mới
        </button>
      } />

      <div className="p-5 flex flex-col gap-4 h-[calc(100vh-56px)]">
        {/* Type filter */}
        {taskTypes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setTypeFilter(null)}
              className="h-[28px] px-3 rounded-[20px] text-[11px] font-medium transition-colors"
              style={{ border: '1px solid var(--v-border)', backgroundColor: typeFilter === null ? 'var(--v-btn-bg)' : 'var(--v-surface)', color: typeFilter === null ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}
            >
              Tất cả
            </button>
            {taskTypes.map((t) => (
              <button key={t.id}
                onClick={() => setTypeFilter((prev) => prev === t.id ? null : t.id)}
                className="h-[28px] px-3 rounded-[20px] text-[11px] font-medium transition-colors"
                style={{
                  border: `1px solid ${typeFilter === t.id ? '#3a5fa0' : 'var(--v-border)'}`,
                  backgroundColor: typeFilter === t.id ? '#3a5fa018' : 'var(--v-surface)',
                  color: typeFilter === t.id ? '#3a5fa0' : 'var(--v-text-2)',
                }}>
                {t.content}
              </button>
            ))}
          </div>
        )}

        {/* Kanban + detail panel */}
        <div className="flex gap-4 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: 'var(--v-muted)' }}>Đang tải…</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={filtered.filter((t) => (t.status ?? 'todo') === col.id)}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId((prev) => prev === id ? null : id)}
                  onAdd={setAddStatus}
                  onToggleDone={toggleDone}
                />
              ))}
            </div>
          )}

          {selectedTask && (
            <DetailPanel
              task={selectedTask}
              types={taskTypes}
              onUpdate={(patch) => void handleUpdate(selectedTask.id, patch)}
              onDelete={() => void handleDelete(selectedTask.id)}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>

      {addStatus && (
        <AddTaskModal
          defaultStatus={addStatus}
          types={taskTypes}
          onClose={() => setAddStatus(null)}
          onAdd={(t) => setTasks((prev) => [t, ...prev])}
        />
      )}
    </>
  )
}
