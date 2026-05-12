'use client'
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, X, Circle, CheckCircle2, Trash2, Calendar, EyeOff, Eye, Maximize2, Minimize2 } from 'lucide-react'
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
}

// ─── constants ───────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'pending',    label: 'Chờ',      color: '#b07a20', bg: '#fef4e2' },
  { id: 'todo',       label: 'Cần làm',  color: '#bbbbbb', bg: 'var(--v-hover)' },
  { id: 'inprogress', label: 'Đang làm', color: '#3a5fa0', bg: '#eef3fa' },
  { id: 'done',       label: 'Xong',     color: '#4a7c3f', bg: '#f0f5ee' },
]

// ─── markdown renderer ────────────────────────────────────────────────────────

function renderInline(text: string): ReactNode {
  const tokens = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\))/)
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('**') && tok.endsWith('**'))
          return <strong key={i}>{tok.slice(2, -2)}</strong>
        if (tok.startsWith('*') && tok.endsWith('*'))
          return <em key={i}>{tok.slice(1, -1)}</em>
        if (tok.startsWith('`') && tok.endsWith('`'))
          return <code key={i} className="rounded px-1 text-[11px] font-mono" style={{ backgroundColor: 'var(--v-hover)' }}>{tok.slice(1, -1)}</code>
        const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (link)
          return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#3b73c8' }}>{link[1]}</a>
        return tok
      })}
    </>
  )
}

function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return <span style={{ color: 'var(--v-muted)' }}>Chưa có ghi chú</span>

  const blocks: ReactNode[] = []
  const lines = content.split('\n')
  let i = 0
  let listBuf: { ordered: boolean; text: string }[] = []
  let inCode = false
  let codeBuf: string[] = []

  const flushList = () => {
    if (!listBuf.length) return
    const ordered = listBuf[0].ordered
    const Tag = ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={blocks.length} className={`${ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-0.5 my-1`}>
        {listBuf.map((item, j) => <li key={j}>{renderInline(item.text)}</li>)}
      </Tag>
    )
    listBuf = []
  }

  while (i < lines.length) {
    const line = lines[i]
    if (line.trimStart().startsWith('```')) {
      if (!inCode) { flushList(); inCode = true; codeBuf = [] }
      else {
        inCode = false
        blocks.push(
          <pre key={blocks.length} className="rounded-[6px] p-2 my-1.5 overflow-x-auto text-[12px] font-mono leading-relaxed" style={{ backgroundColor: 'var(--v-hover)' }}>
            <code>{codeBuf.join('\n')}</code>
          </pre>
        )
      }
      i++; continue
    }
    if (inCode) { codeBuf.push(line); i++; continue }
    const h3 = line.match(/^### (.+)/); if (h3) { flushList(); blocks.push(<h3 key={blocks.length} className="text-[14px] font-semibold mt-3 mb-0.5">{renderInline(h3[1])}</h3>); i++; continue }
    const h2 = line.match(/^## (.+)/);  if (h2) { flushList(); blocks.push(<h2 key={blocks.length} className="text-[15px] font-semibold mt-4 mb-1">{renderInline(h2[1])}</h2>); i++; continue }
    const h1 = line.match(/^# (.+)/);   if (h1) { flushList(); blocks.push(<h1 key={blocks.length} className="text-[17px] font-bold mt-4 mb-1">{renderInline(h1[1])}</h1>); i++; continue }
    if (line.match(/^[-*_]{3,}$/)) { flushList(); blocks.push(<hr key={blocks.length} className="my-2" style={{ borderColor: 'var(--v-border)' }} />); i++; continue }
    const ul = line.match(/^[-*+] (.+)/); if (ul) { listBuf.push({ ordered: false, text: ul[1] }); i++; continue }
    const ol = line.match(/^\d+\. (.+)/); if (ol) { listBuf.push({ ordered: true, text: ol[1] }); i++; continue }
    flushList()
    if (line.trim() === '') { blocks.push(<div key={blocks.length} className="h-2" />); i++; continue }
    blocks.push(<p key={blocks.length} className="leading-relaxed">{renderInline(line)}</p>)
    i++
  }
  flushList()
  return <div className="text-[13px]" style={{ color: 'var(--v-text)' }}>{blocks}</div>
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ task, types, onUpdate, onDelete, onClose }: {
  task: TaskRow
  types: TypeEnumRow[]
  onUpdate: (patch: TaskPatch) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [mode, setMode]         = useState<'view' | 'edit'>('view')
  const [title, setTitle]       = useState(task.title)
  const [content, setContent]   = useState(task.content ?? '')
  const [progress, setProgress] = useState(task.progress ?? 0)
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setMode('view')
    setTitle(task.title)
    setContent(task.content ?? '')
    setProgress(task.progress ?? 0)
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    title !== task.title ||
    content !== (task.content ?? '') ||
    progress !== (task.progress ?? 0)

  const handleSave = async () => {
    setSaving(true)
    const patch: TaskPatch = {}
    if (title !== task.title) patch.title = title
    if (content !== (task.content ?? '')) patch.content = content || null
    if (progress !== (task.progress ?? 0)) patch.progress = progress
    try { onUpdate(patch); setMode('view') } finally { setSaving(false) }
  }

  const handleCancel = () => {
    setTitle(task.title)
    setContent(task.content ?? '')
    setProgress(task.progress ?? 0)
    setMode('view')
  }

  const colMeta = COLUMNS.find((c) => c.id === (task.status ?? 'todo'))

  const modalStyle = {
    border: '1px solid var(--v-border)',
    backgroundColor: 'var(--v-surface)',
    width: expanded ? '82vw' : 'min(680px, 95vw)',
    height: expanded ? '90vh' : undefined,
    maxHeight: expanded ? '90vh' : '88vh',
  }

  const iconBtn = (onClick: () => void, title: string, children: ReactNode) => (
    <button
      onClick={onClick}
      title={title}
      className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors"
      style={{ color: 'var(--v-muted)', backgroundColor: 'transparent' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >{children}</button>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col shadow-2xl rounded-[16px] transition-all duration-200"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── VIEW MODE ─────────────────────────────────────────── */}
        {mode === 'view' && (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-[20px] font-semibold leading-snug mb-2" style={{ color: 'var(--v-text)' }}>
                  {task.title || <span style={{ color: 'var(--v-muted)' }}>Untitled</span>}
                </div>
                {/* Meta pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {colMeta && (
                    <span className="text-[11px] px-2 py-0.5 rounded-[5px]" style={{ backgroundColor: colMeta.bg, color: colMeta.color }}>
                      {colMeta.label}
                    </span>
                  )}
                  {task.typeEnum?.content && (
                    <span className="text-[11px] px-2 py-0.5 rounded-[5px]" style={{ backgroundColor: '#3a5fa018', color: '#3a5fa0' }}>
                      {task.typeEnum.content}
                    </span>
                  )}
                  {task.dueTime && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: isPast(parseISO(task.dueTime)) && task.status !== 'done' ? '#b05040' : 'var(--v-text-3)' }}>
                      <Calendar size={11} />
                      {format(parseISO(task.dueTime), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  )}
                  {task.progress !== null && task.progress > 0 && (
                    <span className="text-[11px]" style={{ color: '#4a7c3f' }}>{task.progress}%</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setMode('edit')}
                  className="h-[28px] px-3 rounded-[7px] text-[12px] font-medium transition-colors"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Sửa
                </button>
                {iconBtn(() => setExpanded((v) => !v), expanded ? 'Thu nhỏ' : 'Phóng to', expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />)}
                {iconBtn(onClose, 'Đóng', <X size={16} />)}
              </div>
            </div>

            {/* Markdown content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {task.content
                ? <SimpleMarkdown content={task.content} />
                : <span className="text-[13px]" style={{ color: 'var(--v-faint)' }}>Chưa có ghi chú</span>
              }
            </div>
          </>
        )}

        {/* ── EDIT MODE ─────────────────────────────────────────── */}
        {mode === 'edit' && (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <textarea
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                placeholder="Tiêu đề"
                className="flex-1 text-[18px] font-semibold resize-none outline-none bg-transparent leading-snug"
                style={{ color: 'var(--v-text)' }}
              />
              <div className="flex items-center gap-1.5 shrink-0 pt-1">
                <button
                  onClick={handleCancel}
                  className="h-[28px] px-3 rounded-[7px] text-[12px] transition-colors"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Hủy
                </button>
                {dirty && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-[28px] px-3 rounded-[7px] text-[12px] font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
                  >
                    {saving ? 'Đang lưu…' : 'Lưu'}
                  </button>
                )}
                {iconBtn(() => setExpanded((v) => !v), expanded ? 'Thu nhỏ' : 'Phóng to', expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />)}
                {iconBtn(onClose, 'Đóng', <X size={16} />)}
              </div>
            </div>

            {/* Body: 2 columns */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left: metadata */}
              <div className="w-[200px] shrink-0 p-5 flex flex-col gap-4 overflow-y-auto" style={{ borderRight: '1px solid var(--v-border-2)' }}>
                <div>
                  <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--v-muted)' }}>TRẠNG THÁI</div>
                  <select
                    value={task.status ?? 'todo'}
                    onChange={(e) => onUpdate({ status: e.target.value })}
                    className="w-full h-[30px] rounded-[7px] px-2 text-[12px] outline-none"
                    style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
                  >
                    {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--v-muted)' }}>LOẠI</div>
                  <select
                    value={task.typeEnumId ?? ''}
                    onChange={(e) => onUpdate({ typeEnumId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full h-[30px] rounded-[7px] px-2 text-[12px] outline-none"
                    style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
                  >
                    <option value="">Không có</option>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.content}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--v-muted)' }}>NGÀY HẾT HẠN</div>
                  <input
                    type="datetime-local"
                    value={task.dueTime ? task.dueTime.slice(0, 16) : ''}
                    onChange={(e) => onUpdate({ dueTime: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full h-[30px] rounded-[7px] px-2 text-[12px] outline-none"
                    style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-medium" style={{ color: 'var(--v-muted)' }}>TIẾN ĐỘ</div>
                    <span className="text-[11px]" style={{ color: 'var(--v-text-3)' }}>{progress}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full accent-[#4a7c3f]"
                  />
                </div>
                <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--v-border-2)' }}>
                  <button
                    onClick={onDelete}
                    className="w-full h-[32px] rounded-[7px] flex items-center justify-center gap-1.5 text-[12px] transition-colors"
                    style={{ border: '1px solid var(--v-border)', color: '#b05040' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b0504010')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash2 size={12} />Xóa task
                  </button>
                </div>
              </div>

              {/* Right: notes editor — split when expanded */}
              <div className="flex-1 p-5 flex flex-col gap-2 overflow-hidden min-h-0">
                <div className="text-[10px] font-medium shrink-0" style={{ color: 'var(--v-muted)' }}>GHI CHÚ</div>
                {expanded ? (
                  <div className="flex gap-3 flex-1 min-h-0">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Ghi chú (hỗ trợ markdown)…"
                      className="flex-1 rounded-[8px] px-4 py-3 text-[13px] resize-none outline-none leading-relaxed font-mono"
                      style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
                    />
                    <div className="flex-1 overflow-y-auto rounded-[8px] px-4 py-3" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-bg)' }}>
                      <SimpleMarkdown content={content} />
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Ghi chú (hỗ trợ markdown)…"
                    className="flex-1 rounded-[8px] px-4 py-3 text-[13px] resize-none outline-none leading-relaxed"
                    style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Task Card ───────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Chờ',      color: '#b07a20', bg: '#fef4e2' },
  todo:       { label: 'Cần làm',  color: '#888888', bg: 'var(--v-hover)' },
  inprogress: { label: 'Đang làm', color: '#3a5fa0', bg: '#eef3fa' },
  done:       { label: 'Xong',     color: '#4a7c3f', bg: '#f0f5ee' },
}

function TaskCard({ task, selected, onSelect, onToggleDone }: {
  task: TaskRow
  selected: boolean
  onSelect: () => void
  onToggleDone: () => void
}) {
  const isDone    = task.status === 'done'
  const isOverdue = task.dueTime && !isDone && isPast(parseISO(task.dueTime))
  const statusMeta = STATUS_META[task.status ?? 'todo']
  const contentPreview = task.content?.replace(/[#*`>_~\[\]]/g, '').split('\n').find((l) => l.trim())?.trim()

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', String(task.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onSelect}
      className="rounded-[10px] p-3 cursor-pointer transition-all"
      style={{
        border: selected ? '1.5px solid #3a5fa0' : '1px solid var(--v-border)',
        backgroundColor: 'var(--v-surface)',
      }}
    >
      {/* Top row: check + title */}
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone() }}
          className="mt-0.5 shrink-0"
        >
          {isDone
            ? <CheckCircle2 size={15} style={{ color: '#4a7c3f' }} />
            : <Circle      size={15} style={{ color: 'var(--v-faint)' }} />
          }
        </button>
        <div
          className="text-[12px] font-medium leading-snug"
          style={{ color: isDone ? 'var(--v-muted)' : 'var(--v-text)', textDecoration: isDone ? 'line-through' : 'none' }}
        >
          {task.title}
        </div>
      </div>

      {/* Content preview */}
      {contentPreview && !isDone && (
        <div className="ml-[23px] text-[11px] mb-2 line-clamp-2 leading-relaxed" style={{ color: 'var(--v-text-3)' }}>
          {contentPreview}
        </div>
      )}

      {/* Progress bar */}
      {task.progress !== null && task.progress > 0 && (
        <div className="ml-[23px] mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--v-hover)' }}>
              <div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: '#4a7c3f' }} />
            </div>
            <span className="text-[10px] ml-2 shrink-0" style={{ color: 'var(--v-text-3)' }}>{task.progress}%</span>
          </div>
        </div>
      )}

      {/* Meta row: type · due date · status */}
      <div className="ml-[23px] flex items-center gap-1.5 flex-wrap">
        {task.typeEnum?.content && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-[4px]" style={{ backgroundColor: '#3a5fa018', color: '#3a5fa0' }}>
            {task.typeEnum.content}
          </span>
        )}
        {task.dueTime && (
          <div className="flex items-center gap-1">
            <Calendar size={10} style={{ color: isOverdue ? '#b05040' : 'var(--v-muted)' }} />
            <span className="text-[10px]" style={{ color: isOverdue ? '#b05040' : 'var(--v-muted)' }}>
              {format(parseISO(task.dueTime), 'dd/MM HH:mm', { locale: vi })}
            </span>
          </div>
        )}
        {statusMeta && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-[4px] ml-auto"
            style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
          >
            {statusMeta.label}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, selectedId, onSelect, onAdd, onToggleDone, onDrop }: {
  col: typeof COLUMNS[0]
  tasks: TaskRow[]
  selectedId: number | null
  onSelect: (id: number) => void
  onAdd: (status: string) => void
  onToggleDone: (id: number) => void
  onDrop: (taskId: number, newStatus: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
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

      <div
        className="flex flex-col gap-2 min-h-[80px] rounded-[10px] p-1.5 -mx-1.5 transition-colors"
        style={{ backgroundColor: dragOver ? 'color-mix(in srgb, var(--v-hover) 60%, transparent)' : 'transparent' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false)
          const taskId = parseInt(e.dataTransfer.getData('taskId'))
          if (!isNaN(taskId)) onDrop(taskId, col.id)
        }}
      >
        {tasks.length === 0 ? (
          <div
            className="rounded-[10px] py-6 text-center text-[11px] transition-colors"
            style={{ border: `1px dashed ${dragOver ? col.color : 'var(--v-border)'}`, color: dragOver ? col.color : 'var(--v-faint)' }}
          >
            {dragOver ? 'Thả vào đây' : 'Chưa có task'}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              selected={selectedId === task.id}
              onSelect={() => onSelect(task.id)}
              onToggleDone={() => onToggleDone(task.id)}
            />
          ))
        )}
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
  const [content, setContent]       = useState('')
  const [status, setStatus]         = useState(defaultStatus)
  const [typeEnumId, setTypeEnumId] = useState<number | null>(null)
  const [dueTime, setDueTime]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview]       = useState(false)
  const [expanded, setExpanded]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const task = await createTask({
        title: title.trim(),
        content: content.trim() || undefined,
        status,
        typeEnumId: typeEnumId ?? undefined,
        dueTime: dueTime ? new Date(dueTime).toISOString() : undefined,
      })
      onAdd(task)
      onClose()
    } catch {
      toast.error('Không tạo được task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col shadow-2xl rounded-[16px] transition-all duration-200"
        style={{
          border: '1px solid var(--v-border)',
          backgroundColor: 'var(--v-surface)',
          width: expanded ? '82vw' : 'min(560px, 95vw)',
          height: expanded ? '90vh' : undefined,
          maxHeight: expanded ? '90vh' : '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--v-text)' }}>Task mới</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors"
              style={{ color: 'var(--v-muted)', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={expanded ? 'Thu nhỏ' : 'Phóng to'}
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors"
              style={{ color: 'var(--v-muted)', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-0">
          {/* Title */}
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề task"
            className="w-full rounded-[8px] px-4 py-2.5 text-[14px] outline-none"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
          />

          {/* Row: status + type + due */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--v-text-2)' }}>Trạng thái</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full h-[32px] px-2 rounded-[7px] text-[12px] outline-none"
                style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}>
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {types.length > 0 ? (
              <div>
                <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--v-text-2)' }}>Loại</label>
                <select value={typeEnumId ?? ''} onChange={(e) => setTypeEnumId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-[32px] px-2 rounded-[7px] text-[12px] outline-none"
                  style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}>
                  <option value="">Không có</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.content}</option>)}
                </select>
              </div>
            ) : <div />}
            <div>
              <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--v-text-2)' }}>Ngày hết hạn</label>
              <input
                type="datetime-local" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
                className="w-full h-[32px] px-2 rounded-[7px] text-[12px] outline-none"
                style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)', color: 'var(--v-text-2)' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex-1 flex flex-col gap-1.5 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <label className="text-[11px] font-medium" style={{ color: 'var(--v-text-2)' }}>Ghi chú</label>
              {!expanded && (
                <button
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                  className="text-[11px] px-2.5 h-[22px] rounded-[5px] transition-colors"
                  style={{ color: 'var(--v-text-3)', backgroundColor: preview ? 'var(--v-hover)' : 'transparent', border: '1px solid var(--v-border)' }}
                >
                  {preview ? 'Sửa' : 'Xem'}
                </button>
              )}
            </div>

            {expanded ? (
              <div className="flex gap-3 flex-1 min-h-0">
                <textarea
                  value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Ghi chú (hỗ trợ markdown)…"
                  className="flex-1 rounded-[8px] px-4 py-3 text-[13px] resize-none outline-none leading-relaxed font-mono"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
                />
                <div
                  className="flex-1 overflow-y-auto rounded-[8px] px-4 py-3"
                  style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-bg)' }}
                >
                  <SimpleMarkdown content={content} />
                </div>
              </div>
            ) : preview ? (
              <div
                className="flex-1 min-h-[120px] overflow-y-auto rounded-[8px] px-4 py-3"
                style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-input-bg)' }}
              >
                <SimpleMarkdown content={content} />
              </div>
            ) : (
              <textarea
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Ghi chú (hỗ trợ markdown)…"
                rows={expanded ? undefined : 5}
                className="flex-1 min-h-[120px] rounded-[8px] px-4 py-3 text-[13px] resize-none outline-none leading-relaxed"
                style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--v-border-2)' }}>
          <button type="button" onClick={onClose}
            className="flex-1 h-[36px] rounded-[8px] text-[13px]"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)' }}>Hủy</button>
          <button type="submit" disabled={submitting}
            className="flex-1 h-[36px] rounded-[8px] text-[13px] font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}>Tạo</button>
        </div>
      </form>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks]           = useState<TaskRow[]>([])
  const [taskTypes, setTaskTypes]   = useState<TypeEnumRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState<number | null>(null)
  const [addStatus, setAddStatus]   = useState<string | null>(null)
  const [hideDone, setHideDone]     = useState(false)
  const [mobileCol, setMobileCol]   = useState(COLUMNS[0].id)

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

  const selectedTask   = tasks.find((t) => t.id === selectedId) ?? null
  const filtered       = tasks.filter((t) => typeFilter === null || t.typeEnumId === typeFilter)
  const doneCount      = tasks.filter((t) => t.status === 'done').length
  const visibleColumns = hideDone ? COLUMNS.filter((c) => c.id !== 'done') : COLUMNS

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
      setSelectedId(null)
    } catch {
      toast.error('Không xóa được')
    }
  }

  const toggleDone = (id: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    void handleUpdate(id, { status: task.status === 'done' ? 'todo' : 'done' })
  }

  const handleDrop = useCallback((taskId: number, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return
    void handleUpdate(taskId, { status: newStatus })
  }, [tasks, handleUpdate])

  return (
    <>
      <V2Topbar />

      <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

        {/* ── Filter row (desktop only) ── */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap px-5 pt-4 pb-3 shrink-0">
          {taskTypes.length > 0 && (
            <>
              <button
                onClick={() => setTypeFilter(null)}
                className="h-[28px] px-3 rounded-[20px] text-[11px] font-medium transition-colors"
                style={{ border: '1px solid var(--v-border)', backgroundColor: typeFilter === null ? 'var(--v-btn-bg)' : 'var(--v-surface)', color: typeFilter === null ? 'var(--v-btn-text)' : 'var(--v-text-2)' }}
              >Tất cả</button>
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
              <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--v-border)' }} />
            </>
          )}
          <button
            onClick={() => setHideDone((v) => !v)}
            className="h-[28px] px-3 rounded-[20px] text-[11px] font-medium flex items-center gap-1.5 transition-colors"
            style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {hideDone ? <Eye size={11} /> : <EyeOff size={11} />}
            {hideDone ? `Hiện done (${doneCount})` : 'Ẩn done'}
          </button>
        </div>

        {/* ── Mobile: tab bar + list ── */}
        <div className="sm:hidden flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto shrink-0" style={{ borderBottom: '1px solid var(--v-border)' }}>
            {visibleColumns.map((col) => {
              const count = filtered.filter((t) => (t.status ?? 'todo') === col.id).length
              const active = mobileCol === col.id
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileCol(col.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium shrink-0 border-b-2 transition-colors"
                  style={{
                    borderBottomColor: active ? col.color : 'transparent',
                    color: active ? col.color : 'var(--v-text-3)',
                    backgroundColor: 'transparent',
                  }}
                >
                  {col.label}
                  <span className="text-[10px] px-1.5 rounded-full" style={{ backgroundColor: active ? col.bg : 'var(--v-hover)', color: active ? col.color : 'var(--v-muted)' }}>
                    {count}
                  </span>
                </button>
              )
            })}
            <button
              onClick={() => setHideDone((v) => !v)}
              className="ml-auto px-3 py-2.5 shrink-0"
              style={{ color: 'var(--v-muted)' }}
            >
              {hideDone ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: 'var(--v-muted)' }}>Đang tải…</div>
            ) : filtered.filter((t) => (t.status ?? 'todo') === mobileCol).length === 0 ? (
              <div className="py-12 text-center text-[12px]" style={{ color: 'var(--v-faint)' }}>Chưa có task</div>
            ) : (
              filtered.filter((t) => (t.status ?? 'todo') === mobileCol).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={selectedId === task.id}
                  onSelect={() => setSelectedId((prev) => prev === task.id ? null : task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Desktop: kanban columns ── */}
        <div className="hidden sm:flex flex-1 overflow-hidden px-5 pb-4">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: 'var(--v-muted)' }}>Đang tải…</div>
          ) : (
            <div className="flex gap-4 w-full h-full">
              {visibleColumns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={filtered.filter((t) => (t.status ?? 'todo') === col.id)}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId((prev) => prev === id ? null : id)}
                  onAdd={setAddStatus}
                  onToggleDone={toggleDone}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedTask && (
        <DetailModal
          task={selectedTask}
          types={taskTypes}
          onUpdate={(patch) => void handleUpdate(selectedTask.id, patch)}
          onDelete={() => void handleDelete(selectedTask.id)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => setAddStatus('todo')}
        className="fixed right-6 z-40 bottom-[76px] sm:bottom-6 flex items-center gap-2 h-[44px] px-5 rounded-full text-[13px] font-medium shadow-lg"
        style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
      >
        <Plus size={16} />
        Task mới
      </button>

      {/* Add modal */}
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
