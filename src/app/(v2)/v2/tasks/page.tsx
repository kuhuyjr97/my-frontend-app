'use client'
import { useState, useMemo, useEffect } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Plus, X, MoreVertical, Check, Calendar, ChevronDown,
  Circle, CheckCircle2, Trash2, GripVertical,
} from 'lucide-react'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { useLocalStorage, nanoid } from '@/lib/v2/storage'
import { SEED_TASKS } from '@/lib/v2/seed'
import type { Task, Subtask, TaskStatus, TaskPriority } from '@/lib/v2/types'

// ─── constants ───────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'backlog',    label: 'Backlog',     color: '#bbbbbb', bg: '#f7f6f3' },
  { id: 'inprogress', label: 'In Progress', color: '#3a5fa0', bg: '#eef3fa' },
  { id: 'review',     label: 'Review',      color: '#a07030', bg: '#faf4ee' },
  { id: 'done',       label: 'Done',        color: '#4a7c3f', bg: '#f0f5ee' },
]

const PRIORITY_META: Record<TaskPriority, { color: string; label: string }> = {
  high:   { color: '#b05040', label: 'High' },
  medium: { color: '#a07030', label: 'Medium' },
  low:    { color: '#4a7c3f', label: 'Low' },
}

const ALL_TAGS = ['Work', 'Personal', 'Finance', 'Design']

// ─── helpers ─────────────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: string }) {
  const colors: Record<string, string> = {
    Work: '#3a5fa0', Personal: '#7040a0', Finance: '#a07030', Design: '#b05040',
  }
  const c = colors[tag] || '#888'
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c + '18', color: c }}>
      {tag}
    </span>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ task, onUpdate, onDelete, onClose }: {
  task: Task
  onUpdate: (t: Task) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => {
    setTitle(task.title)
    setNotes(task.notes || '')
  }, [task.id, task.title, task.notes])

  const save = (patch: Partial<Task>) => onUpdate({ ...task, ...patch, updatedAt: new Date().toISOString() })

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    const st: Subtask = { id: nanoid(), taskId: task.id, title: newSubtask.trim(), done: false }
    save({ subtasks: [...task.subtasks, st] })
    setNewSubtask('')
  }

  const toggleSubtask = (stId: string) => {
    save({ subtasks: task.subtasks.map((s) => s.id === stId ? { ...s, done: !s.done } : s) })
  }

  const deleteSubtask = (stId: string) => {
    save({ subtasks: task.subtasks.filter((s) => s.id !== stId) })
  }

  return (
    <div className="w-[300px] shrink-0 bg-white rounded-[14px] flex flex-col" style={{ border: '1px solid #e8e6e1', height: 'calc(100vh - 56px - 40px)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f0eeea' }}>
        <span className="text-[12px] font-medium" style={{ color: '#555' }}>Task detail</span>
        <button onClick={onClose}><X size={14} color="#bbb" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Title */}
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save({ title })}
          rows={2}
          className="w-full text-[14px] font-medium resize-none outline-none bg-transparent"
          style={{ color: '#1a1a1a' }}
        />

        {/* Status & Priority */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-medium mb-1" style={{ color: '#bbb' }}>STATUS</div>
            <select
              value={task.status}
              onChange={(e) => save({ status: e.target.value as TaskStatus })}
              className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
              style={{ border: '1px solid #e8e6e1', backgroundColor: '#fff', color: '#555' }}
            >
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] font-medium mb-1" style={{ color: '#bbb' }}>PRIORITY</div>
            <select
              value={task.priority}
              onChange={(e) => save({ priority: e.target.value as TaskPriority })}
              className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
              style={{ border: '1px solid #e8e6e1', backgroundColor: '#fff', color: '#555' }}
            >
              {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <div className="text-[10px] font-medium mb-1" style={{ color: '#bbb' }}>DUE DATE</div>
          <input
            type="date" value={task.dueDate || ''}
            onChange={(e) => save({ dueDate: e.target.value || undefined })}
            className="w-full h-[28px] rounded-[6px] px-2 text-[11px] outline-none"
            style={{ border: '1px solid #e8e6e1', backgroundColor: '#fff', color: '#555' }}
          />
        </div>

        {/* Tags */}
        <div>
          <div className="text-[10px] font-medium mb-1" style={{ color: '#bbb' }}>TAGS</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map((tag) => {
              const active = task.tags.includes(tag)
              return (
                <button key={tag} onClick={() => save({ tags: active ? task.tags.filter((t) => t !== tag) : [...task.tags, tag] })}
                  className="text-[10px] px-2 py-0.5 rounded-[20px] transition-colors"
                  style={{
                    border: '1px solid #e8e6e1',
                    backgroundColor: active ? '#1a1a1a' : '#fff',
                    color: active ? '#fff' : '#555',
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <div className="text-[10px] font-medium mb-2" style={{ color: '#bbb' }}>
            SUBTASKS ({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})
          </div>
          <div className="flex flex-col gap-1.5 mb-2">
            {task.subtasks.map((st) => (
              <div key={st.id} className="flex items-center gap-2 group">
                <button onClick={() => toggleSubtask(st.id)} className="shrink-0">
                  {st.done
                    ? <CheckCircle2 size={14} style={{ color: '#4a7c3f' }} />
                    : <Circle size={14} style={{ color: '#ccc' }} />
                  }
                </button>
                <span className="flex-1 text-[12px]" style={{ color: st.done ? '#bbb' : '#1a1a1a', textDecoration: st.done ? 'line-through' : 'none' }}>
                  {st.title}
                </span>
                <button onClick={() => deleteSubtask(st.id)} className="opacity-0 group-hover:opacity-100">
                  <X size={11} color="#ccc" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
              placeholder="Add subtask…"
              className="flex-1 h-[26px] px-2 rounded-[6px] text-[11px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
            />
            <button onClick={addSubtask} className="w-6 h-6 flex items-center justify-center rounded-[6px]" style={{ backgroundColor: '#f0eeea' }}>
              <Plus size={11} color="#555" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] font-medium mb-1" style={{ color: '#bbb' }}>NOTES</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save({ notes })}
            placeholder="Add notes…"
            rows={4}
            className="w-full rounded-[7px] px-3 py-2 text-[12px] resize-none outline-none"
            style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
          />
        </div>
      </div>

      <div className="flex gap-2 p-3" style={{ borderTop: '1px solid #f0eeea' }}>
        <button
          onClick={() => { onDelete(task.id); onClose() }}
          className="flex-1 h-[30px] rounded-[7px] flex items-center justify-center gap-1.5 text-[12px]"
          style={{ border: '1px solid #e8e6e1', color: '#b05040' }}
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, onSelect, selected, onToggleDone }: {
  task: Task
  onSelect: () => void
  selected: boolean
  onToggleDone: () => void
}) {
  const donePct = task.subtasks.length > 0
    ? Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100)
    : null
  const isDone = task.status === 'done'
  const isOverdue = task.dueDate && !isDone && isPast(parseISO(task.dueDate))

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-[10px] p-3 cursor-pointer transition-all"
      style={{
        border: selected ? '1.5px solid #3a5fa0' : '1px solid #e8e6e1',
        borderLeft: selected ? '3px solid #3a5fa0' : '1px solid #e8e6e1',
      }}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone() }}
          className="mt-0.5 shrink-0"
        >
          {isDone
            ? <CheckCircle2 size={15} style={{ color: '#4a7c3f' }} />
            : <Circle size={15} style={{ color: '#ccc' }} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_META[task.priority].color }} />
            <span className="text-[12px] font-medium truncate" style={{ color: isDone ? '#bbb' : '#1a1a1a', textDecoration: isDone ? 'line-through' : 'none' }}>
              {task.title}
            </span>
          </div>
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {task.tags.map((t) => <TagBadge key={t} tag={t} />)}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar size={10} style={{ color: isOverdue ? '#b05040' : '#bbb' }} />
                <span className="text-[10px]" style={{ color: isOverdue ? '#b05040' : '#bbb' }}>
                  {format(parseISO(task.dueDate), 'dd/MM', { locale: vi })}
                </span>
              </div>
            )}
            {donePct !== null && (
              <span className="text-[10px]" style={{ color: '#bbb' }}>
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} done
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, selectedId, onSelect, onAdd, onToggleDone }: {
  col: typeof COLUMNS[0]
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (status: TaskStatus) => void
  onToggleDone: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
        <span className="text-[12px] font-medium" style={{ color: '#1a1a1a' }}>{col.label}</span>
        <span className="text-[11px] px-1.5 rounded-full ml-0.5" style={{ backgroundColor: col.bg, color: col.color }}>
          {tasks.length}
        </span>
        <button
          onClick={() => onAdd(col.id)}
          className="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-[#f0eeea]"
        >
          <Plus size={12} color="#bbb" />
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

function AddTaskModal({ defaultStatus, onClose, onAdd }: {
  defaultStatus: TaskStatus
  onClose: () => void
  onAdd: (t: Task) => void
}) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const now = new Date().toISOString()
    onAdd({
      id: nanoid(), title, status, priority,
      dueDate: dueDate || undefined, tags, notes: '',
      subtasks: [], createdAt: now, updatedAt: now,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div className="bg-white rounded-[14px] w-[400px] shadow-xl" style={{ border: '1px solid #e8e6e1' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0eeea' }}>
          <span className="text-[14px] font-medium" style={{ color: '#1a1a1a' }}>New Task</span>
          <button onClick={onClose}><X size={16} color="#999" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
            style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
                style={{ border: '1px solid #e8e6e1', backgroundColor: '#fff', color: '#555' }}>
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
                style={{ border: '1px solid #e8e6e1', backgroundColor: '#fff', color: '#555' }}>
                {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-[30px] px-2 rounded-[7px] text-[12px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#555', backgroundColor: '#fff' }} />
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => {
                const active = tags.includes(tag)
                return (
                  <button key={tag} type="button"
                    onClick={() => setTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    className="text-[11px] px-2 py-0.5 rounded-[20px]"
                    style={{ border: '1px solid #e8e6e1', backgroundColor: active ? '#1a1a1a' : '#fff', color: active ? '#fff' : '#555' }}>
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-[34px] rounded-[7px] text-[13px]"
              style={{ border: '1px solid #e4e2dd', color: '#555' }}>Cancel</button>
            <button type="submit"
              className="flex-1 h-[34px] rounded-[7px] text-[13px] font-medium"
              style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('v2-tasks', [])
  const [seeded, setSeeded] = useLocalStorage<boolean>('v2-tasks-seeded', false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [addStatus, setAddStatus] = useState<TaskStatus | null>(null)

  useEffect(() => {
    if (!seeded && tasks.length === 0) {
      setTasks(SEED_TASKS)
      setSeeded(true)
    }
  }, [seeded, tasks.length, setTasks, setSeeded])

  const selectedTask = tasks.find((t) => t.id === selectedId) || null

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (timeFilter === 'today') {
        return t.dueDate && isTodayDate(t.dueDate)
      }
      if (timeFilter === 'week') {
        return t.dueDate && isThisWeek(t.dueDate)
      }
      if (timeFilter === 'overdue') {
        return t.dueDate && t.status !== 'done' && isPast(parseISO(t.dueDate))
      }
      return true
    }).filter((t) => {
      if (tagFilter.length === 0) return true
      return tagFilter.some((tag) => t.tags.includes(tag))
    })
  }, [tasks, timeFilter, tagFilter])

  function isTodayDate(dateStr: string) {
    const d = parseISO(dateStr)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  function isThisWeek(dateStr: string) {
    const d = parseISO(dateStr)
    const now = new Date()
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1)
    const end = new Date(start); end.setDate(start.getDate() + 6)
    return d >= start && d <= end
  }

  const updateTask = (updated: Task) => {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const toggleDone = (id: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t
      const newStatus: TaskStatus = t.status === 'done' ? 'backlog' : 'done'
      return { ...t, status: newStatus, updatedAt: new Date().toISOString() }
    }))
  }

  return (
    <>
      <V2Topbar actions={
        <button
          onClick={() => setAddStatus('backlog')}
          className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
          style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
        >
          <Plus size={13} />
          New task
        </button>
      } />

      <div className="p-5 flex flex-col gap-4 h-[calc(100vh-56px)]">
        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-[7px] overflow-hidden" style={{ border: '1px solid #e8e6e1' }}>
            {(['all', 'today', 'week', 'overdue'] as const).map((f) => (
              <button key={f} onClick={() => setTimeFilter(f)}
                className="px-3 h-[30px] text-[12px] font-medium capitalize transition-colors"
                style={{ backgroundColor: timeFilter === f ? '#1a1a1a' : '#fff', color: timeFilter === f ? '#fff' : '#555' }}>
                {f === 'week' ? 'This week' : f}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 ml-1">
            {ALL_TAGS.map((tag) => {
              const active = tagFilter.includes(tag)
              return (
                <button key={tag}
                  onClick={() => setTagFilter((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                  className="h-[30px] px-3 rounded-[20px] text-[11px] font-medium transition-colors"
                  style={{ border: '1px solid #e8e6e1', backgroundColor: active ? '#1a1a1a' : '#fff', color: active ? '#fff' : '#555' }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Kanban + detail panel */}
        <div className="flex gap-4 flex-1 overflow-hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 flex-1">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={filtered.filter((t) => t.status === col.id)}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId((prev) => prev === id ? null : id)}
                onAdd={(status) => setAddStatus(status)}
                onToggleDone={toggleDone}
              />
            ))}
          </div>

          {selectedTask && (
            <DetailPanel
              task={selectedTask}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>

      {addStatus && (
        <AddTaskModal
          defaultStatus={addStatus}
          onClose={() => setAddStatus(null)}
          onAdd={(t) => setTasks((prev) => [...prev, t])}
        />
      )}
    </>
  )
}
