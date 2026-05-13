'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import {
  fetchTypes,
  createType,
  updateType,
  deleteType,
  type TypeEnumRow,
  type TypeMeta,
} from '@/lib/v2/types-api'
import { ICON_LIST, getIcon } from '@/lib/v2/icon-registry'
import { useLang } from '@/lib/v2/i18n/context'

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

const PRESET_COLORS = [
  '#3a5fa0', '#7040a0', '#b05040', '#3a7a3a', '#c89040',
  '#888888', '#c87a20', '#5a9a8a', '#a04070', '#4a7ab0',
]

function IconPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useLang()
  return (
    <div>
      <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--v-text-2)' }}>{t('types.iconLabel')}</div>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-[8px] max-h-[140px] overflow-y-auto" style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-hover)' }}>
        {ICON_LIST.map(({ name, label, Icon }) => (
          <button
            key={name}
            type="button"
            title={label}
            onClick={() => onChange(value === name ? null : name)}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors"
            style={{
              backgroundColor: value === name ? 'var(--v-btn-bg)' : 'transparent',
              border: value === name ? 'none' : '1px solid transparent',
            }}
          >
            <Icon size={14} style={{ color: value === name ? 'var(--v-btn-text)' : 'var(--v-text-2)' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useLang()
  return (
    <div>
      <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--v-text-2)' }}>{t('types.colorLabel')}</div>
      <div className="flex gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(value === c ? null : c)}
            className="w-6 h-6 rounded-full transition-transform"
            style={{
              backgroundColor: c,
              outline: value === c ? `2px solid ${c}` : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>
    </div>
  )
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
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { t } = useLang()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) { toast.error(t('types.nameRequired')); return }
    setSaving(true)
    const meta: TypeMeta | null = (icon || color) ? { icon, color } : null
    try {
      await createType({ type: Number(typeVal), content: content.trim(), meta })
      toast.success(t('types.added'))
      onCreated()
      onClose()
    } catch {
      toast.error(t('types.createError'))
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
        className="bg-white rounded-[14px] w-full max-w-sm shadow-xl flex flex-col max-h-[90dvh]"
        style={{ border: '1px solid var(--v-border)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
          <span className="text-[14px] font-medium" style={{ color: 'var(--v-text)' }}>{t('types.addTypeTitle')}</span>
          <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-[#f0eeea]" aria-label="Close">
            <X size={16} color="#999" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 overflow-y-auto">
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>{t('types.groupLabel')}</label>
            <select
              value={typeVal}
              onChange={(e) => setTypeVal(e.target.value)}
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.type} value={String(c.type)}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--v-text-2)' }}>{t('types.nameLabel')}</label>
            <input
              autoFocus
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('types.namePlaceholder')}
              className="w-full rounded-[7px] px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
            />
          </div>
          <IconPicker value={icon} onChange={setIcon} />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[36px] rounded-[7px] text-[13px] font-medium"
              style={{ border: '1px solid #e4e2dd', color: 'var(--v-text-2)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-[36px] rounded-[7px] text-[13px] font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
            >
              {saving ? t('common.saving') : t('common.add')}
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
  const [icon, setIcon] = useState<string | null>(row.meta?.icon ?? null)
  const [color, setColor] = useState<string | null>(row.meta?.color ?? null)
  const [saving, setSaving] = useState(false)
  const { t } = useLang()

  const handleSave = async () => {
    if (!content.trim()) { toast.error(t('types.nameEmpty')); return }
    setSaving(true)
    const meta: TypeMeta | null = (icon || color) ? { icon, color } : null
    try {
      await updateType(row.id, { content: content.trim(), type: Number(typeVal), meta })
      toast.success(t('types.saved'))
      onSaved()
    } catch {
      toast.error(t('types.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={typeVal}
          onChange={(e) => setTypeVal(e.target.value)}
          className="rounded-[6px] px-2 py-1 text-[12px] outline-none shrink-0"
          style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-surface)' }}
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
            if (e.key === 'Enter') void handleSave()
            if (e.key === 'Escape') onCancel()
          }}
          className="flex-1 min-w-[120px] rounded-[6px] px-2 py-1 text-[13px] outline-none"
          style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)' }}
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] disabled:opacity-50"
          style={{ backgroundColor: 'var(--v-btn-bg)' }}
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
      <div className="flex flex-col gap-2 pl-1">
        <IconPicker value={icon} onChange={setIcon} />
        <ColorPicker value={color} onChange={setColor} />
      </div>
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
  const { t } = useLang()

  const handleDelete = async () => {
    const name = row.content ?? String(row.subType)
    if (!window.confirm(t('types.deleteConfirm').replace('{name}', name))) return
    setDeleting(true)
    try {
      await deleteType(row.id)
      toast.success(t('types.deleted'))
      onDeleted()
    } catch {
      toast.error(t('types.deleteError'))
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
        <InlineEdit
          row={row}
          onSaved={() => { setEditing(false); onEdited() }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  const RowIcon = getIcon(row.meta?.icon)
  const rowColor = row.meta?.color ?? meta.color

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 group"
      style={{ borderBottom: '1px solid var(--v-border-2)' }}
    >
      <div
        className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: rowColor + '20' }}
      >
        <RowIcon size={12} style={{ color: rowColor }} />
      </div>
      <span className="flex-1 text-[13px]" style={{ color: 'var(--v-text)' }}>
        {row.content?.trim() || <span style={{ color: 'var(--v-muted)' }}>—</span>}
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

function CountLabel({ count }: { count: number }) {
  const { t } = useLang()
  return (
    <span className="text-[11px] tabular-nums" style={{ color: 'var(--v-muted)' }}>
      {count} {t('types.countSuffix')}
    </span>
  )
}

function NoTypesLabel() {
  const { t } = useLang()
  return <>{t('types.noTypes')}</>
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
    <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--v-border)' }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: rows.length > 0 ? '1px solid #f0eeea' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--v-text)' }}>{label}</span>
        </div>
        <CountLabel count={rows.length} />
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--v-muted)' }}>
          <NoTypesLabel />
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
  const { t } = useLang()

  const load = useCallback(async () => {
    try {
      const data = await fetchTypes()
      setRows(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') toast.error(t('common.sessionExpired'))
      else toast.error(t('types.loadError'))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
          >
            <Plus size={13} />
            {t('types.addType')}
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
              backgroundColor: filter === FILTER_ALL ? 'var(--v-btn-bg)' : 'var(--v-hover)',
              color: filter === FILTER_ALL ? 'var(--v-btn-text)' : 'var(--v-text-2)',
            }}
          >
            {t('common.all')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.type}
              type="button"
              onClick={() => setFilter(c.type)}
              className="h-[28px] px-3 rounded-[6px] text-[12px] font-medium transition-colors"
              style={{
                backgroundColor: filter === c.type ? c.color : 'var(--v-hover)',
                color: filter === c.type ? 'var(--v-btn-text)' : 'var(--v-text-2)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-[13px]" style={{ color: 'var(--v-text-3)' }}>{t('common.loading')}</div>
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
