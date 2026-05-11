'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import {
  fetchTypes,
  createType,
  updateType,
  deleteType,
  type TypeEnumRow,
} from '@/lib/v2/types-api'

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { type: 4, label: 'Income',  color: '#3a7a3a' },
  { type: 5, label: 'Expense', color: '#b05040' },
  { type: 3, label: 'Task',    color: '#3a5fa0' },
  { type: 2, label: 'Plan',    color: '#7040a0' },
  { type: 1, label: 'Note',    color: '#a07030' },
] as const

type CategoryType = (typeof CATEGORIES)[number]['type']

function catMeta(type: number | null) {
  return CATEGORIES.find((c) => c.type === type) ?? { type: 0, label: 'Other', color: '#888' }
}

// ─── AddModal ─────────────────────────────────────────────────────────────────

function AddModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [typeVal, setTypeVal] = useState<string>(String(CATEGORIES[0].type))
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) { toast.error('Nhập tên loại'); return }
    setSaving(true)
    try {
      await createType({ type: Number(typeVal), content: content.trim() })
      toast.success('Đã thêm')
      onCreated()
      onClose()
    } catch {
      toast.error('Lỗi khi tạo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[14px] w-full max-w-sm shadow-xl"
        style={{ border: '1px solid #e8e6e1' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0eeea' }}>
          <span className="text-[14px] font-medium" style={{ color: '#1a1a1a' }}>Thêm loại mới</span>
          <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#f0eeea]" aria-label="Close">
            <X size={16} color="#999" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Nhóm</label>
            <select
              value={typeVal}
              onChange={(e) => setTypeVal(e.target.value)}
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a', backgroundColor: '#fff' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.type} value={String(c.type)}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: '#555' }}>Tên loại</label>
            <input
              autoFocus
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="VD: Ăn uống, Lương, Công việc…"
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[36px] rounded-[7px] text-[13px] font-medium"
              style={{ border: '1px solid #e4e2dd', color: '#555' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-[36px] rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
            >
              {saving ? 'Đang lưu…' : 'Thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── InlineEdit ───────────────────────────────────────────────────────────────

function InlineEdit({
  row,
  onSaved,
  onCancel,
}: {
  row: TypeEnumRow
  onSaved: () => void
  onCancel: () => void
}) {
  const [content, setContent] = useState(row.content ?? '')
  const [typeVal, setTypeVal] = useState<string>(String(row.type ?? CATEGORIES[0].type))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!content.trim()) { toast.error('Tên không được để trống'); return }
    setSaving(true)
    try {
      await updateType(row.id, { content: content.trim(), type: Number(typeVal) })
      toast.success('Đã lưu')
      onSaved()
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 py-1 flex-wrap">
      <select
        value={typeVal}
        onChange={(e) => setTypeVal(e.target.value)}
        className="rounded-[6px] px-2 py-1 text-[12px] outline-none shrink-0"
        style={{ border: '1px solid #e8e6e1', color: '#1a1a1a', backgroundColor: '#fff' }}
      >
        {CATEGORIES.map((c) => (
          <option key={c.type} value={String(c.type)}>{c.label}</option>
        ))}
      </select>
      <input
        autoFocus
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
        className="flex-1 min-w-[120px] rounded-[6px] px-2 py-1 text-[13px] outline-none"
        style={{ border: '1px solid #e8e6e1', color: '#1a1a1a' }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-7 h-7 flex items-center justify-center rounded-[6px] disabled:opacity-50"
        style={{ backgroundColor: '#1a1a1a' }}
        aria-label="Save"
      >
        <Check size={13} color="#fff" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f0eeea]"
        aria-label="Cancel"
      >
        <X size={13} color="#999" />
      </button>
    </div>
  )
}

// ─── TypeRow ──────────────────────────────────────────────────────────────────

function TypeRow({
  row,
  onEdited,
  onDeleted,
}: {
  row: TypeEnumRow
  onEdited: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const meta = catMeta(row.type)

  const handleDelete = async () => {
    if (!window.confirm(`Xóa loại "${row.content ?? row.subType}"?`)) return
    setDeleting(true)
    try {
      await deleteType(row.id)
      toast.success('Đã xóa')
      onDeleted()
    } catch {
      toast.error('Lỗi khi xóa')
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="px-4 py-2" style={{ borderBottom: '1px solid #f7f6f3' }}>
        <InlineEdit
          row={row}
          onSaved={() => { setEditing(false); onEdited() }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 group"
      style={{ borderBottom: '1px solid #f7f6f3' }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: meta.color }}
      />
      <span className="flex-1 text-[13px]" style={{ color: '#1a1a1a' }}>
        {row.content?.trim() || <span style={{ color: '#bbb' }}>—</span>}
      </span>
      <span className="text-[11px] tabular-nums shrink-0" style={{ color: '#ccc' }}>
        #{row.subType}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-[#f0eeea]"
          aria-label="Edit"
        >
          <Pencil size={12} color="#999" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-6 h-6 flex items-center justify-center rounded-[5px] hover:bg-[#fbeaea] disabled:opacity-40"
          aria-label="Delete"
        >
          <Trash2 size={12} color="#b05040" />
        </button>
      </div>
    </div>
  )
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  type,
  label,
  color,
  rows,
  onEdited,
  onDeleted,
}: {
  type: number
  label: string
  color: string
  rows: TypeEnumRow[]
  onEdited: () => void
  onDeleted: () => void
}) {
  return (
    <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid #e8e6e1' }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: rows.length > 0 ? '1px solid #f0eeea' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{label}</span>
        </div>
        <span className="text-[11px] tabular-nums" style={{ color: '#bbb' }}>
          {rows.length} loại
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-3 text-[12px]" style={{ color: '#bbb' }}>
          Chưa có loại nào — bấm + để thêm
        </div>
      ) : (
        <div>
          {rows.map((r) => (
            <TypeRow key={r.id} row={r} onEdited={onEdited} onDeleted={onDeleted} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FILTER_ALL = 0

export default function TypesPage() {
  const [rows, setRows] = useState<TypeEnumRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<number>(FILTER_ALL)

  const load = useCallback(async () => {
    try {
      const data = await fetchTypes()
      setRows(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') toast.error('Phiên đăng nhập hết hạn')
      else toast.error('Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return rows
    return rows.filter((r) => r.type === filter)
  }, [rows, filter])

  const groupedByCategory = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        rows: filtered
          .filter((r) => r.type === cat.type)
          .sort((a, b) => a.subType - b.subType),
      })),
    [filtered],
  )

  const visibleGroups = filter === FILTER_ALL
    ? groupedByCategory
    : groupedByCategory.filter((g) => g.type === filter)

  return (
    <>
      <V2Topbar
        actions={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
            style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
          >
            <Plus size={13} />
            Thêm loại
          </button>
        }
      />

      <div className="p-4 sm:p-5 flex flex-col gap-4 max-w-[800px] mx-auto w-full pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ paddingTop: 72 }}>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter(FILTER_ALL)}
            className="h-[28px] px-3 rounded-[6px] text-[12px] font-medium transition-colors"
            style={{
              backgroundColor: filter === FILTER_ALL ? '#1a1a1a' : '#f0eeea',
              color: filter === FILTER_ALL ? '#fff' : '#555',
            }}
          >
            Tất cả
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.type}
              type="button"
              onClick={() => setFilter(c.type)}
              className="h-[28px] px-3 rounded-[6px] text-[12px] font-medium transition-colors"
              style={{
                backgroundColor: filter === c.type ? c.color : '#f0eeea',
                color: filter === c.type ? '#fff' : '#555',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-[13px]" style={{ color: '#999' }}>Đang tải…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleGroups.map((g) => (
              <CategoryCard
                key={g.type}
                type={g.type}
                label={g.label}
                color={g.color}
                rows={g.rows}
                onEdited={load}
                onDeleted={load}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onCreated={() => void load()}
        />
      )}
    </>
  )
}
