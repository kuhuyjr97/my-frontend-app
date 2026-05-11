'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Search, X, Trash2, Tag, Pencil, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { fetchNotes, createNote, updateNote, deleteNote, type NoteRow } from '@/lib/v2/notes-api'
import { fetchTypes, type TypeEnumRow } from '@/lib/v2/types-api'

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
  // draft edits — flushed on "Lưu"
  const [draftTitle, setDraftTitle]     = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftTypeId, setDraftTypeId]   = useState<number | null>(null)
  const [dirty, setDirty]               = useState(false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)

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

  // ── select ────────────────────────────────────────────────────────────────

  const selectNote = (note: NoteRow) => {
    setSelectedId(note.id)
    setDraftTitle(note.title)
    setDraftContent(note.content)
    setDraftTypeId(note.typeEnumId)
    setDirty(false)
    setEditing(false)
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
            style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
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
          style={{ borderRight: '1px solid #e8e6e1', backgroundColor: '#fff' }}
        >

          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid #f0eeea' }}>
            <div className="flex items-center gap-2 h-[30px] px-3 rounded-[7px]" style={{ border: '1px solid #e8e6e1' }}>
              <Search size={12} color="#bbb" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm…"
                className="flex-1 text-[12px] outline-none bg-transparent"
                style={{ color: '#1a1a1a' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}>
                  <X size={11} color="#bbb" />
                </button>
              )}
            </div>
          </div>

          {/* Type filter */}
          {noteTypes.length > 0 && (
            <div className="px-3 py-2 flex flex-wrap gap-1" style={{ borderBottom: '1px solid #f0eeea' }}>
              <button
                type="button"
                onClick={() => setTypeFilter(null)}
                className="text-[10px] px-2 py-0.5 rounded-[20px] transition-colors"
                style={{
                  border: '1px solid #e8e6e1',
                  backgroundColor: typeFilter === null ? '#1a1a1a' : '#fff',
                  color: typeFilter === null ? '#fff' : '#555',
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
                    border: `1px solid ${typeFilter === t.id ? '#4a7c3f' : '#e8e6e1'}`,
                    backgroundColor: typeFilter === t.id ? '#4a7c3f18' : '#fff',
                    color: typeFilter === t.id ? '#4a7c3f' : '#555',
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
              <div className="p-4 text-[12px]" style={{ color: '#bbb' }}>Đang tải…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-[12px]" style={{ color: '#bbb' }}>Không có ghi chú nào</div>
            ) : (
              filtered.map((note) => (
                <div
                  key={note.id}
                  className="group relative w-full text-left px-4 py-3 transition-colors cursor-pointer"
                  style={{
                    borderBottom: '1px solid #f7f6f3',
                    backgroundColor: selectedId === note.id ? '#faf9f7' : 'transparent',
                    borderLeft: selectedId === note.id ? '3px solid #4a7c3f' : '3px solid transparent',
                  }}
                  onClick={() => selectNote(note)}
                >
                  <div className="text-[13px] font-medium mb-0.5 truncate pr-6" style={{ color: '#1a1a1a' }}>
                    {note.title || 'Untitled'}
                  </div>
                  <div className="text-[11px] mb-1.5 truncate" style={{ color: '#bbb' }}>
                    {note.content.replace(/[#*`\-[\]]/g, '').slice(0, 60) || 'Chưa có nội dung'}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px]" style={{ color: '#ccc' }}>
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
            className={`${mobileShowDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col overflow-hidden transition-colors`}
            style={{ backgroundColor: editing ? '#fff' : '#faf9f7' }}
          >

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 sm:px-6 h-[48px] shrink-0 transition-colors" style={{ borderBottom: '1px solid #f0eeea', backgroundColor: editing ? '#f7f6f3' : '#fff' }}>

              {/* Back button — mobile only */}
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="sm:hidden shrink-0 flex items-center justify-center w-7 h-7 rounded-[7px] hover:bg-[#f0eeea] -ml-1"
              >
                <ChevronLeft size={18} color="#555" />
              </button>

              {/* Type selector */}
              <div className="flex items-center gap-1 flex-1 flex-wrap min-w-0 overflow-hidden">
                <Tag size={12} color="#bbb" />
                {noteTypes.length === 0 ? (
                  <span className="text-[10px]" style={{ color: '#ccc' }}>Chưa có loại — thêm trong Settings</span>
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
                          color: active ? '#4a7c3f' : '#ccc',
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
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setDraftTitle(selectedNote.title); setDraftContent(selectedNote.content); setDraftTypeId(selectedNote.typeEnumId); setDirty(false) }}
                    className="h-[26px] px-3 rounded-[6px] text-[11px] font-medium transition-colors"
                    style={{ border: '1px solid #e4e2dd', color: '#888' }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !dirty}
                    className="h-[26px] px-3 rounded-[6px] text-[11px] font-medium transition-colors disabled:opacity-40"
                    style={{ backgroundColor: dirty ? '#1a1a1a' : '#f0eeea', color: dirty ? '#fff' : '#aaa' }}
                  >
                    {saving ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="shrink-0 flex items-center gap-1 h-[26px] px-3 rounded-[6px] text-[11px] font-medium hover:bg-[#f0eeea] transition-colors"
                  style={{ color: '#555' }}
                >
                  <Pencil size={11} />
                  Sửa
                </button>
              )}
            </div>

            {/* Title */}
            <div className="px-5 sm:px-8 pt-5 sm:pt-6 pb-2 shrink-0 transition-colors" style={{ backgroundColor: editing ? '#fff' : '#faf9f7' }}>
              {editing ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => { setDraftTitle(e.target.value); setDirty(true) }}
                  placeholder="Untitled"
                  className="w-full text-[22px] font-medium outline-none bg-transparent"
                  style={{ color: '#1a1a1a' }}
                />
              ) : (
                <div className="text-[22px] font-medium" style={{ color: '#1a1a1a' }}>
                  {draftTitle || <span style={{ color: '#bbb' }}>Untitled</span>}
                </div>
              )}
              <div className="text-[11px] mt-1" style={{ color: '#ccc' }}>
                {format(parseISO(selectedNote.updatedAt), 'd MMM yyyy, HH:mm', { locale: vi })}
                {dirty && <span className="ml-2" style={{ color: '#a07030' }}>· Chưa lưu</span>}
              </div>
            </div>
            <div className="h-px mx-5 sm:mx-8" style={{ backgroundColor: '#f0eeea' }} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 sm:py-5">
              {editing ? (
                <textarea
                  value={draftContent}
                  onChange={(e) => { setDraftContent(e.target.value); setDirty(true) }}
                  placeholder="Bắt đầu viết…"
                  className="w-full h-full min-h-[300px] text-[13px] leading-relaxed resize-none outline-none rounded-[10px] p-4"
                  style={{ color: '#1a1a1a', backgroundColor: '#f7f6f3', border: '1px solid #e8e6e1' }}
                />
              ) : (
                <div
                  className="text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: draftContent ? '#1a1a1a' : '#bbb' }}
                >
                  {draftContent || 'Chưa có nội dung'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="text-[14px] font-medium mb-1" style={{ color: '#555' }}>Chọn ghi chú</div>
              <div className="text-[12px]" style={{ color: '#bbb' }}>Chọn từ danh sách hoặc tạo ghi chú mới</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
