'use client'
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Search, X, Trash2, Tag, Pencil, Maximize2, Minimize2 } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { fetchNotes, createNote, updateNote, deleteNote, type NoteRow } from '@/lib/v2/notes-api'
import { fetchTypes, type TypeEnumRow } from '@/lib/v2/types-api'
import { useLang } from '@/lib/v2/i18n/context'

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
          return <code key={i} className="rounded px-1 text-[12px] font-mono" style={{ backgroundColor: 'var(--v-hover)' }}>{tok.slice(1, -1)}</code>
        const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (link)
          return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#3b73c8' }}>{link[1]}</a>
        return tok
      })}
    </>
  )
}

function SimpleMarkdown({ content, noContentText }: { content: string; noContentText?: string }) {
  if (!content) return <span style={{ color: 'var(--v-muted)' }}>{noContentText ?? ''}</span>

  const blocks: ReactNode[] = []
  const lines = content.split('\n')
  let i = 0
  let listBuf: { ordered: boolean; checked?: boolean; text: string }[] = []
  let quoteBuf: string[] = []
  let tableBuf: string[] = []
  let inCode = false
  let codeBuf: string[] = []
  let inDetails = false
  let detailsSummary = ''
  let detailsContent: string[] = []

  const flushList = () => {
    if (!listBuf.length) return
    const hasCheckboxes = listBuf.some((item) => item.checked !== undefined)
    if (hasCheckboxes) {
      blocks.push(
        <ul key={blocks.length} className="space-y-1.5 my-1 pl-0 list-none">
          {listBuf.map((item, j) =>
            item.checked !== undefined ? (
              <li key={j} className="flex items-start gap-2">
                <input type="checkbox" checked={item.checked} readOnly className="mt-0.5 shrink-0 cursor-default accent-[#4a7c3f]" />
                <span style={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--v-muted)' : 'inherit' }}>{renderInline(item.text)}</span>
              </li>
            ) : (
              <li key={j} className="flex items-start gap-2"><span className="mt-0.5 shrink-0 select-none">•</span>{renderInline(item.text)}</li>
            )
          )}
        </ul>
      )
    } else {
      const ordered = listBuf[0].ordered
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={blocks.length} className={`${ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-0.5 my-1`}>
          {listBuf.map((item, j) => <li key={j}>{renderInline(item.text)}</li>)}
        </Tag>
      )
    }
    listBuf = []
  }

  const flushQuote = () => {
    if (!quoteBuf.length) return
    blocks.push(
      <blockquote key={blocks.length} className="border-l-[3px] pl-4 my-2 italic" style={{ borderColor: 'var(--v-border-2)', color: 'var(--v-text-3)' }}>
        {quoteBuf.map((q, j) => <p key={j} className="leading-relaxed">{renderInline(q)}</p>)}
      </blockquote>
    )
    quoteBuf = []
  }

  const isTableRow = (ln: string) => /^\|.+\|/.test(ln.trim())
  const isSeparator = (ln: string) => {
    const cells = ln.trim().split('|').slice(1, -1)
    return cells.length > 0 && cells.every((c) => /^[\s\-:]+$/.test(c))
  }

  const flushTable = () => {
    if (!tableBuf.length) return
    const parseRow = (row: string) => row.trim().split('|').slice(1, -1).map((c) => c.trim())
    const headers = parseRow(tableBuf[0])
    const dataRows = tableBuf.slice(tableBuf.length > 1 && isSeparator(tableBuf[1]) ? 2 : 1)
    blocks.push(
      <div key={blocks.length} className="overflow-x-auto my-3">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr>
              {headers.map((h, j) => (
                <th key={j} className="px-3 py-2 text-left font-semibold" style={{ borderBottom: '2px solid var(--v-border-2)', color: 'var(--v-text-2)' }}>{renderInline(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--v-border)' }}>
                {parseRow(row).map((cell, ci) => (
                  <td key={ci} className="px-3 py-2" style={{ color: 'var(--v-text)' }}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableBuf = []
  }

  const flushAll = () => { flushList(); flushQuote(); flushTable() }

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '<details>') {
      flushAll(); inDetails = true; detailsSummary = ''; detailsContent = []; i++; continue
    }
    if (inDetails) {
      if (line.trim() === '</details>') {
        const body = detailsContent.join('\n'); const sumText = detailsSummary
        blocks.push(
          <details key={blocks.length} className="my-3 rounded-[10px]" style={{ border: '1px solid var(--v-border)' }}>
            <summary className="px-4 py-2.5 cursor-pointer text-[13px] font-medium select-none" style={{ color: 'var(--v-text-2)' }}>{sumText || 'Details'}</summary>
            <div className="px-4 pb-4 pt-1"><SimpleMarkdown content={body} /></div>
          </details>
        )
        inDetails = false; i++; continue
      }
      const sm = line.match(/<summary>(.*?)<\/summary>/i)
      if (sm) { detailsSummary = sm[1]; i++; continue }
      detailsContent.push(line); i++; continue
    }

    if (line.trimStart().startsWith('```')) {
      if (!inCode) { flushAll(); inCode = true; codeBuf = [] }
      else {
        inCode = false
        blocks.push(
          <pre key={blocks.length} className="rounded-[8px] p-3 my-2 overflow-x-auto text-[12px] font-mono leading-relaxed" style={{ backgroundColor: 'var(--v-hover)' }}>
            <code>{codeBuf.join('\n')}</code>
          </pre>
        )
      }
      i++; continue
    }
    if (inCode) { codeBuf.push(line); i++; continue }

    const h3 = line.match(/^### (.+)/); if (h3) { flushAll(); blocks.push(<h3 key={blocks.length} className="text-[15px] font-semibold mt-4 mb-0.5">{renderInline(h3[1])}</h3>); i++; continue }
    const h2 = line.match(/^## (.+)/);  if (h2) { flushAll(); blocks.push(<h2 key={blocks.length} className="text-[17px] font-semibold mt-5 mb-1">{renderInline(h2[1])}</h2>); i++; continue }
    const h1 = line.match(/^# (.+)/);   if (h1) { flushAll(); blocks.push(<h1 key={blocks.length} className="text-[20px] font-bold mt-5 mb-1">{renderInline(h1[1])}</h1>); i++; continue }
    if (line.match(/^[-*_]{3,}$/)) { flushAll(); blocks.push(<hr key={blocks.length} className="my-3" style={{ borderColor: 'var(--v-border)' }} />); i++; continue }

    const bq = line.match(/^> (.*)/)
    if (bq) { flushList(); flushTable(); quoteBuf.push(bq[1]); i++; continue }

    if (isTableRow(line)) { flushList(); flushQuote(); tableBuf.push(line); i++; continue }

    const chk = line.match(/^[-*+] \[([x ])\] (.+)/i)
    if (chk) { flushQuote(); flushTable(); listBuf.push({ ordered: false, checked: chk[1].toLowerCase() === 'x', text: chk[2] }); i++; continue }

    const ul = line.match(/^[-*+] (.+)/); if (ul) { flushQuote(); flushTable(); listBuf.push({ ordered: false, text: ul[1] }); i++; continue }
    const ol = line.match(/^\d+\. (.+)/); if (ol) { flushQuote(); flushTable(); listBuf.push({ ordered: true, text: ol[1] }); i++; continue }

    flushAll()
    if (line.trim() === '') { blocks.push(<div key={blocks.length} className="h-2" />) }
    else { blocks.push(<p key={blocks.length} className="leading-relaxed">{renderInline(line)}</p>) }
    i++
  }
  flushAll()
  return <div className="text-[13px]" style={{ color: 'var(--v-text)' }}>{blocks}</div>
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ note, types, initialMode = 'view', onSave, onDelete, onClose }: {
  note: NoteRow
  types: TypeEnumRow[]
  initialMode?: 'view' | 'edit'
  onSave: (patch: { title: string; content: string; typeEnumId: number | null }) => Promise<void>
  onDelete: () => void
  onClose: () => void
}) {
  const [mode, setMode]       = useState<'view' | 'edit'>(initialMode)
  const [title, setTitle]     = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [typeId, setTypeId]   = useState(note.typeEnumId)
  const [saving, setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { t } = useLang()

  // Cmd/Ctrl+S
  useEffect(() => {
    if (mode !== 'edit') return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); void doSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, title, content, typeId])

  const dirty = title !== note.title || content !== note.content || typeId !== note.typeEnumId

  const doSave = async () => {
    setSaving(true)
    try {
      await onSave({ title, content, typeEnumId: typeId })
      setMode('view')
    } catch { /* error toasted by parent */ }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setTitle(note.title)
    setContent(note.content)
    setTypeId(note.typeEnumId)
    setMode('view')
  }

  const iconBtn = (onClick: () => void, ttl: string, children: ReactNode) => (
    <button
      onClick={onClick}
      title={ttl}
      className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors"
      style={{ color: 'var(--v-muted)', backgroundColor: 'transparent' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >{children}</button>
  )

  const modalStyle = {
    border: '1px solid var(--v-border)',
    backgroundColor: 'var(--v-surface)',
    width: expanded ? '82vw' : 'min(720px, 95vw)',
    height: expanded ? '90vh' : undefined,
    maxHeight: expanded ? '90vh' : '88vh',
  }

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
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-[20px] font-semibold leading-snug mb-2" style={{ color: 'var(--v-text)' }}>
                  {note.title || <span style={{ color: 'var(--v-muted)' }}>{t('notes.untitled')}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px]" style={{ color: 'var(--v-faint)' }}>
                    {format(parseISO(note.updatedAt), 'd MMM yyyy, HH:mm', { locale: vi })}
                  </span>
                  {note.typeEnum?.content && (
                    <span className="text-[11px] px-2 py-0.5 rounded-[5px]" style={{ backgroundColor: '#4a7c3f18', color: '#4a7c3f' }}>
                      {note.typeEnum.content}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setMode('edit')}
                  className="h-[28px] px-3 rounded-[7px] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Pencil size={11} />{t('common.edit')}
                </button>
                {iconBtn(() => setExpanded((v) => !v), expanded ? t('notes.minimize') : t('notes.expand'), expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />)}
                {iconBtn(onClose, t('common.close'), <X size={16} />)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {note.content
                ? <SimpleMarkdown content={note.content} noContentText={t('notes.noContent')} />
                : <span className="text-[13px]" style={{ color: 'var(--v-faint)' }}>{t('notes.noContent')}</span>
              }
            </div>
          </>
        )}

        {/* ── EDIT MODE ─────────────────────────────────────────── */}
        {mode === 'edit' && (
          <>
            <div className="flex items-start gap-3 px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  rows={1}
                  placeholder={t('notes.titlePlaceholder')}
                  className="w-full text-[18px] font-semibold resize-none outline-none bg-transparent leading-snug"
                  style={{ color: 'var(--v-text)' }}
                />
                {types.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag size={11} style={{ color: 'var(--v-muted)' }} />
                    {types.map((t) => {
                      const active = typeId === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTypeId(active ? null : t.id)}
                          className="text-[10px] px-2 py-0.5 rounded transition-colors"
                          style={{
                            backgroundColor: active ? '#4a7c3f18' : 'transparent',
                            color: active ? '#4a7c3f' : 'var(--v-faint)',
                            border: active ? '1px solid #4a7c3f30' : '1px solid transparent',
                          }}
                        >
                          {t.content ?? `#${t.subType}`}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-1">
                <button
                  onClick={handleCancel}
                  className="h-[28px] px-3 rounded-[7px] text-[12px] transition-colors"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >{t('common.cancel')}</button>
                {dirty && (
                  <button
                    onClick={() => void doSave()}
                    disabled={saving || (types.length > 0 && typeId === null)}
                    title={types.length > 0 && typeId === null ? 'Chọn type trước khi lưu' : undefined}
                    className="h-[28px] px-3 rounded-[7px] text-[12px] font-medium disabled:opacity-40"
                    style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
                  >{saving ? t('common.saving') : t('common.save')}</button>
                )}
                {iconBtn(() => setExpanded((v) => !v), expanded ? t('notes.minimize') : t('notes.expand'), expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />)}
                {iconBtn(onClose, t('common.close'), <X size={16} />)}
              </div>
            </div>

            {/* Split: editor left, preview right (preview ẩn trên mobile) */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className="flex-1 flex flex-col p-5 min-h-0 sm:border-r" style={{ borderColor: 'var(--v-border-2)' }}>
                <div className="text-[10px] font-medium mb-2 shrink-0" style={{ color: 'var(--v-muted)' }}>{t('notes.contentLabel')}</div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('notes.contentPlaceholder')}
                  className="flex-1 text-[13px] resize-none outline-none leading-relaxed font-mono rounded-[8px] px-4 py-3"
                  style={{ border: '1px solid var(--v-border)', color: 'var(--v-text)', backgroundColor: 'var(--v-input-bg)' }}
                />
              </div>
              <div className="hidden sm:flex flex-1 flex-col p-5 overflow-hidden min-h-0" style={{ backgroundColor: 'var(--v-bg)' }}>
                <div className="text-[10px] font-medium mb-2 shrink-0" style={{ color: 'var(--v-muted)' }}>{t('notes.previewLabel')}</div>
                <div className="flex-1 overflow-y-auto">
                  <SimpleMarkdown content={content} noContentText={t('notes.noContent')} />
                </div>
              </div>
            </div>

            {/* Delete button at bottom */}
            <div className="px-6 py-3 shrink-0 flex justify-start" style={{ borderTop: '1px solid var(--v-border-2)' }}>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 h-[28px] px-3 rounded-[7px] text-[12px] transition-colors"
                style={{ border: '1px solid var(--v-border)', color: '#b05040' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b0504010')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={12} />{t('notes.deleteNote')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [notes, setNotes]           = useState<NoteRow[]>([])
  const [noteTypes, setNoteTypes]   = useState<TypeEnumRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [openInEdit, setOpenInEdit] = useState(false)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState<number | null>(null)
  const newNoteIdRef                = useRef<number | null>(null)
  const { t } = useLang()

  const load = useCallback(async () => {
    try {
      const data = await fetchNotes()
      setNotes(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') toast.error(t('common.sessionExpired'))
      else toast.error(t('notes.loadError'))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load()
    fetchTypes()
      .then((all) => setNoteTypes(all.filter((t) => t.type === 1)))
      .catch(() => {/* silent */})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  const filtered = notes
    .filter((n) => {
      const matchSearch = !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === null || n.typeEnumId === typeFilter
      return matchSearch && matchType
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const handleCreate = async () => {
    try {
      const note = await createNote({ title: t('notes.untitled'), content: '' })
      setNotes((prev) => [note, ...prev])
      setSelectedId(note.id)
      setOpenInEdit(true)
      newNoteIdRef.current = note.id
    } catch {
      toast.error(t('notes.createError'))
    }
  }

  const handleSave = useCallback(async (id: number, patch: { title: string; content: string; typeEnumId: number | null }) => {
    try {
      const updated = await updateNote(id, patch)
      setNotes((prev) => prev.map((n) => n.id === id ? updated : n))
      if (id === newNoteIdRef.current) newNoteIdRef.current = null
      toast.success(t('notes.saved'))
    } catch {
      toast.error(t('notes.saveError'))
      throw new Error('save failed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('notes.deleteConfirm'))) return
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (id === newNoteIdRef.current) newNoteIdRef.current = null
      setSelectedId(null)
      setOpenInEdit(false)
    } catch {
      toast.error(t('notes.deleteError'))
    }
  }

  const openNote = (note: NoteRow) => {
    setSelectedId(note.id)
    setOpenInEdit(false)
  }

  const closeModal = () => {
    if (selectedId !== null && selectedId === newNoteIdRef.current) {
      void deleteNote(selectedId).catch(() => {})
      setNotes((prev) => prev.filter((n) => n.id !== selectedId))
      newNoteIdRef.current = null
    }
    setSelectedId(null)
    setOpenInEdit(false)
  }

  return (
    <>
      <V2Topbar
        actions={
          <button
            onClick={handleCreate}
            className="hidden sm:flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
            style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
          >
            <Plus size={13} />
            {t('notes.newNote')}
          </button>
        }
      />

      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)', backgroundColor: 'var(--v-bg)' }}>

        {/* Search + filter */}
        <div className="px-4 sm:px-6 pt-4 pb-3 shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Row 1 (always): search + desktop filters inline */}
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 h-[28px] px-3 rounded-[20px] flex-1 sm:flex-none"
              style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
            >
              <Search size={11} style={{ color: 'var(--v-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('notes.searchPlaceholder')}
                className="flex-1 sm:w-[140px] min-w-0 text-[11px] outline-none bg-transparent"
                style={{ color: 'var(--v-text)' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}>
                  <X size={10} style={{ color: 'var(--v-muted)' }} />
                </button>
              )}
            </div>

            {/* Divider + filters — desktop only inline */}
            {noteTypes.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-px h-4" style={{ backgroundColor: 'var(--v-border)' }} />
                <button
                  type="button"
                  onClick={() => setTypeFilter(null)}
                  className="h-[28px] px-3 rounded-[20px] text-[11px] font-medium transition-colors"
                  style={{
                    border: '1px solid var(--v-border)',
                    backgroundColor: typeFilter === null ? 'var(--v-btn-bg)' : 'var(--v-surface)',
                    color: typeFilter === null ? 'var(--v-btn-text)' : 'var(--v-text-2)',
                  }}
                >{t('notes.all')}</button>
                {noteTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeFilter((prev) => prev === t.id ? null : t.id)}
                    className="h-[28px] px-3 rounded-[20px] text-[11px] font-medium transition-colors"
                    style={{
                      border: `1px solid ${typeFilter === t.id ? '#4a7c3f' : 'var(--v-border)'}`,
                      backgroundColor: typeFilter === t.id ? '#4a7c3f18' : 'var(--v-surface)',
                      color: typeFilter === t.id ? '#4a7c3f' : 'var(--v-text-2)',
                    }}
                  >{t.content ?? `#${t.subType}`}</button>
                ))}
              </div>
            )}
          </div>

          {/* Row 2 (mobile only): type filters */}
          {noteTypes.length > 0 && (
            <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setTypeFilter(null)}
                className="h-[26px] px-3 rounded-[20px] text-[11px] font-medium shrink-0 transition-colors"
                style={{
                  border: '1px solid var(--v-border)',
                  backgroundColor: typeFilter === null ? 'var(--v-btn-bg)' : 'var(--v-surface)',
                  color: typeFilter === null ? 'var(--v-btn-text)' : 'var(--v-text-2)',
                }}
              >{t('notes.all')}</button>
              {noteTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter((prev) => prev === t.id ? null : t.id)}
                  className="h-[26px] px-3 rounded-[20px] text-[11px] font-medium shrink-0 transition-colors"
                  style={{
                    border: `1px solid ${typeFilter === t.id ? '#4a7c3f' : 'var(--v-border)'}`,
                    backgroundColor: typeFilter === t.id ? '#4a7c3f18' : 'var(--v-surface)',
                    color: typeFilter === t.id ? '#4a7c3f' : 'var(--v-text-2)',
                  }}
                >{t.content ?? `#${t.subType}`}</button>
              ))}
            </div>
          )}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-[12px]" style={{ color: 'var(--v-muted)' }}>{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[12px]" style={{ color: 'var(--v-muted)' }}>
              {notes.length === 0 ? t('notes.noNotes') : t('notes.noResults')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 sm:p-6">
              {filtered.map((note) => {
                const preview = note.content.replace(/[#*`\-[\]]/g, '').split('\n').find((l) => l.trim())?.trim()
                return (
                  <div
                    key={note.id}
                    onClick={() => openNote(note)}
                    className="group relative rounded-[12px] p-4 cursor-pointer transition-all"
                    style={{
                      border: selectedId === note.id ? '1.5px solid #4a7c3f' : '1px solid var(--v-border)',
                      backgroundColor: 'var(--v-surface)',
                    }}
                    onMouseEnter={(e) => { if (selectedId !== note.id) e.currentTarget.style.borderColor = 'var(--v-border-2)' }}
                    onMouseLeave={(e) => { if (selectedId !== note.id) e.currentTarget.style.borderColor = 'var(--v-border)' }}
                  >
                    <div className="text-[13px] font-semibold mb-1.5 truncate pr-5" style={{ color: 'var(--v-text)' }}>
                      {note.title || t('notes.untitled')}
                    </div>
                    {preview && (
                      <div className="text-[11px] mb-3 line-clamp-3 leading-relaxed" style={{ color: 'var(--v-text-3)' }}>
                        {preview}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px]" style={{ color: 'var(--v-faint)' }}>
                        {format(parseISO(note.updatedAt), 'd MMM', { locale: vi })}
                      </span>
                      {note.typeEnum?.content && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#4a7c3f18', color: '#4a7c3f' }}>
                          {note.typeEnum.content}
                        </span>
                      )}
                    </div>
                    {/* Delete on hover */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleDelete(note.id) }}
                      className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'var(--v-hover)' }}
                      aria-label="Xóa"
                    >
                      <Trash2 size={11} color="#b05040" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* FAB (mobile) */}
        <button
          onClick={handleCreate}
          className="sm:hidden fixed right-5 bottom-[76px] z-40 flex items-center gap-2 h-[44px] px-5 rounded-full text-[13px] font-medium shadow-lg"
          style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
        >
          <Plus size={16} />
          {t('notes.newNote')}
        </button>
      </div>

      {/* Note modal */}
      {selectedNote && (
        <NoteModal
          key={selectedNote.id}
          note={selectedNote}
          types={noteTypes}
          initialMode={openInEdit ? 'edit' : 'view'}
          onSave={(patch) => handleSave(selectedNote.id, patch)}
          onDelete={() => void handleDelete(selectedNote.id)}
          onClose={closeModal}
        />
      )}
    </>
  )
}
