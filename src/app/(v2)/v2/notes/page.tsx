'use client'
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Search, X, Trash2, Tag, Pencil, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { fetchNotes, createNote, updateNote, deleteNote, type NoteRow } from '@/lib/v2/notes-api'
import { fetchTypes, type TypeEnumRow } from '@/lib/v2/types-api'

// ─── simple markdown renderer (no external deps) ──────────────────────────────

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

function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return <span style={{ color: 'var(--v-muted)' }}>Chưa có nội dung</span>

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
          <pre key={blocks.length} className="rounded-[8px] p-3 my-2 overflow-x-auto text-[12px] font-mono leading-relaxed" style={{ backgroundColor: 'var(--v-hover)' }}>
            <code>{codeBuf.join('\n')}</code>
          </pre>
        )
      }
      i++; continue
    }
    if (inCode) { codeBuf.push(line); i++; continue }

    const h3 = line.match(/^### (.+)/); if (h3) { flushList(); blocks.push(<h3 key={blocks.length} className="text-[15px] font-semibold mt-4 mb-0.5">{renderInline(h3[1])}</h3>); i++; continue }
    const h2 = line.match(/^## (.+)/);  if (h2) { flushList(); blocks.push(<h2 key={blocks.length} className="text-[17px] font-semibold mt-5 mb-1">{renderInline(h2[1])}</h2>); i++; continue }
    const h1 = line.match(/^# (.+)/);   if (h1) { flushList(); blocks.push(<h1 key={blocks.length} className="text-[20px] font-bold mt-5 mb-1">{renderInline(h1[1])}</h1>); i++; continue }
    if (line.match(/^[-*_]{3,}$/)) { flushList(); blocks.push(<hr key={blocks.length} className="my-3" style={{ borderColor: 'var(--v-border)' }} />); i++; continue }

    const ul = line.match(/^[-*+] (.+)/); if (ul) { listBuf.push({ ordered: false, text: ul[1] }); i++; continue }
    const ol = line.match(/^\d+\. (.+)/); if (ol) { listBuf.push({ ordered: true, text: ol[1] }); i++; continue }

    flushList()
    if (line.trim() === '') { blocks.push(<div key={blocks.length} className="h-2" />) }
    else { blocks.push(<p key={blocks.length} className="leading-relaxed">{renderInline(line)}</p>) }
    i++
  }

  flushList()
  return <div className="text-[13px]" style={{ color: 'var(--v-text)' }}>{blocks}</div>
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [notes, setNotes]           = useState<NoteRow[]>([])
  const [noteTypes, setNoteTypes]   = useState<TypeEnumRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState<number | null>(null)
  const [saving, setSaving]         = useState(false)
  const [editing, setEditing]       = useState(false)
  const [draftTitle, setDraftTitle]     = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftTypeId, setDraftTypeId]   = useState<number | null>(null)
  const [dirty, setDirty]               = useState(false)
  const [previewMode, setPreviewMode]   = useState(false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const contentPanelRef = useRef<HTMLDivElement>(null)

  // ── load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async (keepSelected?: number) => {
    try {
      const data = await fetchNotes()
      setNotes(data)
      const firstId = keepSelected ?? (data.length > 0 ? data[0].id : null)
      if (firstId !== null) {
        const note = data.find((n) => n.id === firstId) ?? data[0]
        if (note) selectNote(note)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'UNAUTHORIZED') toast.error('Phiên đăng nhập hết hạn')
      else toast.error('Không tải được ghi chú')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    fetchTypes()
      .then((all) => setNoteTypes(all.filter((t) => t.type === 1)))
      .catch(() => {/* silent */})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── select ────────────────────────────────────────────────────────────────

  const selectNote = (note: NoteRow) => {
    setSelectedId(note.id)
    setDraftTitle(note.title)
    setDraftContent(note.content)
    setDraftTypeId(note.typeEnumId)
    setDirty(false)
    setEditing(false)
    setPreviewMode(false)
    setMobileShowDetail(true)
  }

  // ── derived ───────────────────────────────────────────────────────────────

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

  // ── create ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      const note = await createNote({ title: 'Untitled', content: '' })
      setNotes((prev) => [note, ...prev])
      selectNote(note)
      setEditing(true)
    } catch {
      toast.error('Không tạo được ghi chú')
    }
  }

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!selectedNote) return
    setSaving(true)
    try {
      const updated = await updateNote(selectedNote.id, {
        title: draftTitle,
        content: draftContent,
        typeEnumId: draftTypeId,
      })
      setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n))
      setDirty(false)
      setEditing(false)
      setPreviewMode(false)
      toast.success('Đã lưu')
    } catch {
      toast.error('Không lưu được')
    } finally {
      setSaving(false)
    }
  }, [selectedNote, draftTitle, draftContent, draftTypeId])

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); void handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  const handleTypeToggle = (typeId: number) => {
    const next = draftTypeId === typeId ? null : typeId
    setDraftTypeId(next)
    setDirty(true)
  }

  // ── delete (from list hover) ───────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa ghi chú này?')) return
    try {
      await deleteNote(id)
      const remaining = notes.filter((n) => n.id !== id)
      setNotes(remaining)
      if (selectedId === id) {
        if (remaining.length > 0) selectNote(remaining[0])
        else { setSelectedId(null); setDirty(false); setMobileShowDetail(false) }
      }
    } catch {
      toast.error('Không xóa được')
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <V2Topbar
        actions={
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
            style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)' }}
          >
            <Plus size={13} />
            Ghi chú mới
          </button>
        }
      />

      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Left panel: list ─────────────────────────────────────── */}
        <div
          className={`${mobileShowDetail ? 'hidden sm:flex' : 'flex'} w-full sm:w-[260px] shrink-0 flex-col`}
          style={{ borderRight: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
        >

          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
            <div className="flex items-center gap-2 h-[30px] px-3 rounded-[7px]" style={{ border: '1px solid var(--v-border)' }}>
              <Search size={12} style={{ color: 'var(--v-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm…"
                className="flex-1 text-[12px] outline-none bg-transparent"
                style={{ color: 'var(--v-text)' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}>
                  <X size={11} style={{ color: 'var(--v-muted)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Type filter */}
          {noteTypes.length > 0 && (
            <div className="px-3 py-2 flex flex-wrap gap-1" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
              <button
                type="button"
                onClick={() => setTypeFilter(null)}
                className="text-[10px] px-2 py-0.5 rounded-[20px] transition-colors"
                style={{
                  border: '1px solid var(--v-border)',
                  backgroundColor: typeFilter === null ? 'var(--v-btn-bg)' : 'var(--v-surface)',
                  color: typeFilter === null ? 'var(--v-btn-text)' : 'var(--v-text-2)',
                }}
              >
                Tất cả
              </button>
              {noteTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter((prev) => prev === t.id ? null : t.id)}
                  className="text-[10px] px-2 py-0.5 rounded-[20px] transition-colors"
                  style={{
                    border: `1px solid ${typeFilter === t.id ? '#4a7c3f' : 'var(--v-border)'}`,
                    backgroundColor: typeFilter === t.id ? '#4a7c3f18' : 'var(--v-surface)',
                    color: typeFilter === t.id ? '#4a7c3f' : 'var(--v-text-2)',
                  }}
                >
                  {t.content ?? `#${t.subType}`}
                </button>
              ))}
            </div>
          )}

          {/* Note list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-[12px]" style={{ color: 'var(--v-muted)' }}>Đang tải…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-[12px]" style={{ color: 'var(--v-muted)' }}>Không có ghi chú nào</div>
            ) : (
              filtered.map((note) => (
                <div
                  key={note.id}
                  className="group relative w-full text-left px-4 py-3 transition-colors cursor-pointer"
                  style={{
                    borderBottom: '1px solid var(--v-border-2)',
                    backgroundColor: selectedId === note.id ? 'var(--v-hover)' : 'transparent',
                    borderLeft: selectedId === note.id ? '3px solid #4a7c3f' : '3px solid transparent',
                  }}
                  onClick={() => selectNote(note)}
                >
                  <div className="text-[13px] font-medium mb-0.5 truncate pr-6" style={{ color: 'var(--v-text)' }}>
                    {note.title || 'Untitled'}
                  </div>
                  <div className="text-[11px] mb-1.5 truncate" style={{ color: 'var(--v-muted)' }}>
                    {note.content.replace(/[#*`\-[\]]/g, '').slice(0, 60) || 'Chưa có nội dung'}
                  </div>
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
                    className="absolute top-3 right-3 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#fbeaea]"
                    aria-label="Xóa"
                  >
                    <Trash2 size={11} color="#b05040" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: editor ──────────────────────────────────── */}
        {selectedNote ? (
          <div
            ref={contentPanelRef}
            className={`${mobileShowDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col overflow-hidden transition-colors`}
            style={{ backgroundColor: editing ? 'var(--v-surface)' : 'var(--v-bg)' }}
          >

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 sm:px-6 h-[48px] shrink-0 transition-colors" style={{ borderBottom: '1px solid var(--v-border-2)', backgroundColor: editing ? 'var(--v-bg)' : 'var(--v-surface)' }}>

              {/* Back button — mobile only */}
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="sm:hidden shrink-0 flex items-center justify-center w-7 h-7 rounded-[7px] -ml-1"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ChevronLeft size={18} style={{ color: 'var(--v-text-2)' }} />
              </button>

              {/* Type selector */}
              <div className="flex items-center gap-1 flex-1 flex-wrap min-w-0 overflow-hidden">
                <Tag size={12} style={{ color: 'var(--v-muted)' }} />
                {noteTypes.length === 0 ? (
                  <span className="text-[10px]" style={{ color: 'var(--v-faint)' }}>Chưa có loại — thêm trong Settings</span>
                ) : (
                  noteTypes.map((t) => {
                    const active = draftTypeId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTypeToggle(t.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                        style={{
                          backgroundColor: active ? '#4a7c3f18' : 'transparent',
                          color: active ? '#4a7c3f' : 'var(--v-faint)',
                          border: active ? '1px solid #4a7c3f30' : '1px solid transparent',
                        }}
                      >
                        {t.content ?? `#${t.subType}`}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Edit / Save buttons */}
              {editing ? (
                <div className="shrink-0 flex items-center gap-1.5">
                  {/* Write / Preview toggle */}
                  <div className="flex rounded-[6px] overflow-hidden" style={{ border: '1px solid var(--v-border)' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewMode(false)}
                      className="h-[26px] px-2.5 text-[11px] font-medium transition-colors"
                      style={{ backgroundColor: !previewMode ? 'var(--v-btn-bg)' : 'transparent', color: !previewMode ? 'var(--v-btn-text)' : 'var(--v-text-3)' }}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode(true)}
                      className="h-[26px] px-2.5 text-[11px] font-medium transition-colors"
                      style={{ backgroundColor: previewMode ? 'var(--v-btn-bg)' : 'transparent', color: previewMode ? 'var(--v-btn-text)' : 'var(--v-text-3)' }}
                    >
                      Preview
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setPreviewMode(false); setDraftTitle(selectedNote.title); setDraftContent(selectedNote.content); setDraftTypeId(selectedNote.typeEnumId); setDirty(false) }}
                    className="h-[26px] px-3 rounded-[6px] text-[11px] font-medium transition-colors"
                    style={{ border: '1px solid var(--v-border)', color: 'var(--v-text-3)' }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !dirty}
                    className="h-[26px] px-3 rounded-[6px] text-[11px] font-medium transition-colors disabled:opacity-40"
                    style={{ backgroundColor: dirty ? 'var(--v-btn-bg)' : 'var(--v-hover)', color: dirty ? 'var(--v-btn-text)' : 'var(--v-text-3)' }}
                  >
                    {saving ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="shrink-0 flex items-center gap-1 h-[26px] px-3 rounded-[6px] text-[11px] font-medium transition-colors"
                    style={{ color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Pencil size={11} />
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isFullscreen) document.exitFullscreen()
                      else contentPanelRef.current?.requestFullscreen()
                    }}
                    className="shrink-0 flex items-center justify-center h-[26px] w-[26px] rounded-[6px] transition-colors"
                    style={{ color: 'var(--v-text-2)', backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
                  >
                    {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                  </button>
                </>
              )}
            </div>

            {/* Title */}
            <div className="px-5 sm:px-8 pt-5 sm:pt-6 pb-2 shrink-0 transition-colors" style={{ backgroundColor: editing ? 'var(--v-surface)' : 'var(--v-bg)' }}>
              {editing ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => { setDraftTitle(e.target.value); setDirty(true) }}
                  placeholder="Untitled"
                  className="w-full text-[22px] font-medium outline-none bg-transparent"
                  style={{ color: 'var(--v-text)' }}
                />
              ) : (
                <div className="text-[22px] font-medium" style={{ color: 'var(--v-text)' }}>
                  {draftTitle || <span style={{ color: 'var(--v-muted)' }}>Untitled</span>}
                </div>
              )}
              <div className="text-[11px] mt-1" style={{ color: 'var(--v-faint)' }}>
                {format(parseISO(selectedNote.updatedAt), 'd MMM yyyy, HH:mm', { locale: vi })}
                {dirty && <span className="ml-2" style={{ color: '#a07030' }}>· Chưa lưu</span>}
              </div>
            </div>
            <div className="h-px mx-5 sm:mx-8" style={{ backgroundColor: 'var(--v-border-2)' }} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 sm:py-5">
              {editing && !previewMode ? (
                <textarea
                  value={draftContent}
                  onChange={(e) => { setDraftContent(e.target.value); setDirty(true) }}
                  placeholder="Bắt đầu viết…"
                  className="w-full h-full min-h-[300px] text-[13px] leading-relaxed resize-none outline-none rounded-[10px] p-4 font-mono"
                  style={{ color: 'var(--v-text)', backgroundColor: 'var(--v-bg)', border: '1px solid var(--v-border)' }}
                />
              ) : (
                <SimpleMarkdown content={draftContent} />
              )}
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="text-[14px] font-medium mb-1" style={{ color: 'var(--v-text-2)' }}>Chọn ghi chú</div>
              <div className="text-[12px]" style={{ color: 'var(--v-muted)' }}>Chọn từ danh sách hoặc tạo ghi chú mới</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
