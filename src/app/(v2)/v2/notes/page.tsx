'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Search, X, Tag, Eye, Edit3, Trash2 } from 'lucide-react'
import { V2Topbar } from '@/components/v2/layout/Topbar'
import { useLocalStorage, nanoid } from '@/lib/v2/storage'
import { SEED_NOTES } from '@/lib/v2/seed'
import type { Note } from '@/lib/v2/types'

const ALL_NOTE_TAGS = ['Work', 'Personal', 'Ideas', 'Dev']

const TAG_COLORS: Record<string, string> = {
  Work: '#3a5fa0', Personal: '#7040a0', Ideas: '#a07030', Dev: '#4a7c3f',
}

function NoteTagBadge({ tag }: { tag: string }) {
  const c = TAG_COLORS[tag] || '#888'
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: c + '18', color: c }}>
      {tag}
    </span>
  )
}

// ─── simple markdown renderer ─────────────────────────────────────────────────

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="text-[13px] leading-relaxed" style={{ color: '#1a1a1a' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-[16px] font-medium mt-3 mb-1" style={{ color: '#1a1a1a' }}>{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-[14px] font-medium mt-2 mb-1" style={{ color: '#1a1a1a' }}>{line.slice(4)}</h3>
        if (line.startsWith('# ')) return <h1 key={i} className="text-[20px] font-medium mt-3 mb-2" style={{ color: '#1a1a1a' }}>{line.slice(2)}</h1>
        if (line.startsWith('- [ ] ')) return (
          <div key={i} className="flex items-center gap-2 my-0.5">
            <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ borderColor: '#ccc' }} />
            <span style={{ color: '#555' }}>{line.slice(6)}</span>
          </div>
        )
        if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) return (
          <div key={i} className="flex items-center gap-2 my-0.5">
            <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: '#4a7c3f' }}>
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ color: '#bbb', textDecoration: 'line-through' }}>{line.slice(6)}</span>
          </div>
        )
        if (line.startsWith('- ')) return <div key={i} className="flex gap-2 my-0.5"><span style={{ color: '#bbb' }}>•</span><span>{line.slice(2)}</span></div>
        if (/^\d+\. /.test(line)) {
          const m = line.match(/^(\d+)\. (.*)/)
          if (m) return <div key={i} className="flex gap-2 my-0.5"><span style={{ color: '#bbb', minWidth: 16 }}>{m[1]}.</span><span>{m[2]}</span></div>
        }
        if (line.trim() === '') return <div key={i} className="h-2" />

        const parsed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code style="background:#f0eeea;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
        return <p key={i} className="my-0.5" dangerouslySetInnerHTML={{ __html: parsed }} />
      })}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [notes, setNotes] = useLocalStorage<Note[]>('v2-notes', [])
  const [seeded, setSeeded] = useLocalStorage<boolean>('v2-notes-seeded', false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!seeded && notes.length === 0) {
      setNotes(SEED_NOTES)
      setSeeded(true)
    }
  }, [seeded, notes.length, setNotes, setSeeded])

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id)
    }
  }, [notes, selectedId])

  const selectedNote = notes.find((n) => n.id === selectedId) || null

  const filtered = notes.filter((n) => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || n.tags.includes(tagFilter)
    return matchSearch && matchTag
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const updateNote = useCallback((patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => n.id === selectedId ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
  }, [selectedId, setNotes])

  const debouncedUpdate = useCallback((patch: Partial<Note>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => updateNote(patch), 500)
  }, [updateNote])

  const createNote = () => {
    const now = new Date().toISOString()
    const note: Note = { id: nanoid(), title: 'Untitled', content: '', tags: [], createdAt: now, updatedAt: now }
    setNotes((prev) => [note, ...prev])
    setSelectedId(note.id)
    setMode('edit')
  }

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const toggleTag = (tag: string) => {
    if (!selectedNote) return
    const tags = selectedNote.tags.includes(tag)
      ? selectedNote.tags.filter((t) => t !== tag)
      : [...selectedNote.tags, tag]
    updateNote({ tags })
  }

  return (
    <>
      <V2Topbar actions={
        <button onClick={createNote}
          className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-medium"
          style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
          <Plus size={13} />
          New note
        </button>
      } />

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left panel */}
        <div className="w-[280px] shrink-0 flex flex-col" style={{ borderRight: '1px solid #e8e6e1', backgroundColor: '#fff' }}>
          {/* Search */}
          <div className="p-3" style={{ borderBottom: '1px solid #f0eeea' }}>
            <div className="flex items-center gap-2 h-[30px] px-3 rounded-[7px]" style={{ border: '1px solid #e8e6e1' }}>
              <Search size={12} color="#bbb" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="flex-1 text-[12px] outline-none bg-transparent" style={{ color: '#1a1a1a' }}
              />
              {search && <button onClick={() => setSearch('')}><X size={11} color="#bbb" /></button>}
            </div>
          </div>

          {/* Tag filter */}
          <div className="px-3 py-2 flex flex-wrap gap-1" style={{ borderBottom: '1px solid #f0eeea' }}>
            <button
              onClick={() => setTagFilter(null)}
              className="text-[10px] px-2 py-0.5 rounded-[20px]"
              style={{ border: '1px solid #e8e6e1', backgroundColor: !tagFilter ? '#1a1a1a' : '#fff', color: !tagFilter ? '#fff' : '#555' }}>
              All
            </button>
            {ALL_NOTE_TAGS.map((tag) => {
              const c = TAG_COLORS[tag] || '#888'
              return (
                <button key={tag}
                  onClick={() => setTagFilter((prev) => prev === tag ? null : tag)}
                  className="text-[10px] px-2 py-0.5 rounded-[20px] transition-colors"
                  style={{
                    border: `1px solid ${tagFilter === tag ? c : '#e8e6e1'}`,
                    backgroundColor: tagFilter === tag ? c + '18' : '#fff',
                    color: tagFilter === tag ? c : '#555',
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  borderBottom: '1px solid #f7f6f3',
                  backgroundColor: selectedId === note.id ? '#faf9f7' : 'transparent',
                  borderLeft: selectedId === note.id ? '3px solid #4a7c3f' : '3px solid transparent',
                }}
              >
                <div className="text-[13px] font-medium mb-0.5 truncate" style={{ color: '#1a1a1a' }}>{note.title || 'Untitled'}</div>
                <div className="text-[11px] mb-1.5 truncate" style={{ color: '#bbb' }}>
                  {note.content.replace(/[#*`\-[\]]/g, '').slice(0, 60) || 'No content'}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px]" style={{ color: '#ccc' }}>
                    {format(parseISO(note.updatedAt), 'd MMM', { locale: vi })}
                  </span>
                  {note.tags.map((t) => <NoteTagBadge key={t} tag={t} />)}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[12px]" style={{ color: '#bbb' }}>No notes found</div>
            )}
          </div>
        </div>

        {/* Right panel – editor */}
        {selectedNote ? (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#faf9f7' }}>
            {/* Editor toolbar */}
            <div className="flex items-center gap-2 px-6 h-[48px] bg-white" style={{ borderBottom: '1px solid #f0eeea' }}>
              {/* Tags */}
              <div className="flex items-center gap-1 flex-1 flex-wrap">
                <Tag size={12} color="#bbb" />
                {ALL_NOTE_TAGS.map((tag) => {
                  const active = selectedNote.tags.includes(tag)
                  const c = TAG_COLORS[tag] || '#888'
                  return (
                    <button key={tag}
                      onClick={() => toggleTag(tag)}
                      className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                      style={{
                        backgroundColor: active ? c + '18' : 'transparent',
                        color: active ? c : '#ccc',
                        border: active ? `1px solid ${c}30` : '1px solid transparent',
                      }}>
                      {tag}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMode('edit')}
                  className="flex items-center gap-1 h-[26px] px-2.5 rounded-[6px] text-[11px]"
                  style={{ backgroundColor: mode === 'edit' ? '#f0eeea' : 'transparent', color: mode === 'edit' ? '#1a1a1a' : '#bbb' }}>
                  <Edit3 size={11} />
                  Edit
                </button>
                <button
                  onClick={() => setMode('preview')}
                  className="flex items-center gap-1 h-[26px] px-2.5 rounded-[6px] text-[11px]"
                  style={{ backgroundColor: mode === 'preview' ? '#f0eeea' : 'transparent', color: mode === 'preview' ? '#1a1a1a' : '#bbb' }}>
                  <Eye size={11} />
                  Preview
                </button>
              </div>
              <button onClick={() => deleteNote(selectedNote.id)}>
                <Trash2 size={13} color="#ccc" className="hover:text-[#b05040]" />
              </button>
            </div>

            {/* Title */}
            <div className="px-8 pt-6 pb-2 bg-white">
              <input
                value={selectedNote.title}
                onChange={(e) => debouncedUpdate({ title: e.target.value })}
                placeholder="Untitled"
                className="w-full text-[22px] font-medium outline-none bg-transparent"
                style={{ color: '#1a1a1a' }}
              />
              <div className="text-[11px] mt-1" style={{ color: '#ccc' }}>
                Updated {format(parseISO(selectedNote.updatedAt), "d MMM yyyy, HH:mm", { locale: vi })}
              </div>
            </div>
            <div className="h-px mx-8" style={{ backgroundColor: '#f0eeea' }} />

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-5">
              {mode === 'edit' ? (
                <textarea
                  value={selectedNote.content}
                  onChange={(e) => debouncedUpdate({ content: e.target.value })}
                  placeholder="Start writing… (supports markdown)"
                  className="w-full h-full min-h-[300px] text-[13px] leading-relaxed resize-none outline-none bg-transparent"
                  style={{ color: '#1a1a1a', fontFamily: 'ui-monospace, monospace' }}
                />
              ) : (
                <MarkdownPreview content={selectedNote.content} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[14px] font-medium mb-1" style={{ color: '#555' }}>No note selected</div>
              <div className="text-[12px]" style={{ color: '#bbb' }}>Pick a note from the list or create a new one</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
