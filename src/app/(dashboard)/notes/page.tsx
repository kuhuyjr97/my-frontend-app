'use client'

import { useState, useEffect } from 'react'
import { StatusBar } from '@/components/dashboard/status-bar'
import axios from 'axios'

interface Note {
  id: number
  title: string
  content: string
  type: number
  createdAt: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 1
  })
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedNote, setEditedNote] = useState<Note | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL

  useEffect(() => {
    fetchNotes()
    console.log('baseUrl', baseUrl)
  }, [selectedType])

  const fetchNotes = async () => {
    const token = localStorage.getItem('token')
    try {
      setLoading(true)
      const url = selectedType 
        ? `https://my-backend-app-vkiq.onrender.com/notes/type/${selectedType}`
        : 'https://my-backend-app-vkiq.onrender.com/notes'
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNotes(response.data)
      setError('')
    } catch (err: unknown) {
      console.error("Error fetching notes:", err)
      setError('Failed to fetch notes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async (e: React.FormEvent) => {
    const token = localStorage.getItem("token")
    e.preventDefault()
    try {
      await axios.post('https://my-backend-app-vkiq.onrender.com/notes', newNote, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNewNote({ title: '', content: '', type: 1 })
      fetchNotes()
    } catch (err: unknown) {
      console.error('Error creating note:', err)
      setError('Failed to create note')
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    const token = localStorage.getItem("token")
    try {
      await axios.delete(`https://my-backend-app-vkiq.onrender.com/notes/${noteId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      closeModal()
      fetchNotes()
    } catch (err: unknown) {
      console.error('Error deleting note:', err)
      setError('Failed to delete note')
    }
  }

  const handleEditNote = async () => {
    if (!editedNote) return
    
    const token = localStorage.getItem("token")
    try {
      setIsSaving(true)
      await axios.patch(`https://my-backend-app-vkiq.onrender.com/notes/${editedNote.id}`, {
        title: editedNote.title,
        content: editedNote.content,
        type: editedNote.type
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      // Fetch updated note
      const response = await axios.get(`https://my-backend-app-vkiq.onrender.com/notes/${editedNote.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      // Close current modal
      closeModal()
      
      // Fetch all notes to update the list
      await fetchNotes()
      
      // Open new modal with fresh data
      openNoteModal(response.data)
    } catch (err: unknown) {
      console.error('Error editing note:', err)
      setError('Failed to edit note')
    } finally {
      setIsSaving(false)
    }
  }

  const openNoteModal = (note: Note) => {
    setSelectedNote(note)
    setEditedNote({...note})
    setIsModalOpen(true)
    setIsExpanded(false)
    setIsEditing(false)
    setShowMenu(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedNote(null)
    setEditedNote(null)
    setIsExpanded(false)
    setIsEditing(false)
    setShowMenu(false)
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const startEditing = () => {
    setIsEditing(true)
    setShowMenu(false)
  }

  return (
    <div className="flex h-screen">
      
      <div className="flex-1 bg-gray-100">
        <StatusBar title="Ghi chú" />
        
        <div className="p-6">
          {/* Filter Section */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 rounded transition-all duration-300 ${
                  selectedType === null 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedType(1)}
                className={`px-4 py-2 rounded transition-all duration-300 ${
                  selectedType === 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Type 1
              </button>
              <button
                onClick={() => setSelectedType(2)}
                className={`px-4 py-2 rounded transition-all duration-300 ${
                  selectedType === 2 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Type 2
              </button>
            </div>
          </div>

          {/* Create Note Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 transform transition-all duration-300 hover:shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Tạo ghi chú mới</h2>
            <form onSubmit={handleCreateNote}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Nội dung
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Type
                </label>
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote({...newNote, type: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                >
                  <option value={1}>Type 1</option>
                  <option value={2}>Type 2</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
              >
                Tạo ghi chú
              </button>
            </form>
          </div>

          {/* Notes List */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <div 
                  key={note.id} 
                  className="bg-white rounded-lg shadow p-6 transform transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                  onClick={() => openNoteModal(note)}
                >
                  <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{note.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Type: {note.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedNote && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div 
            className={`bg-white rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl ${
              isExpanded ? 'w-[90%] h-[90vh]' : 'max-w-lg w-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editedNote?.title || ''}
                  onChange={(e) => setEditedNote({...editedNote!, title: e.target.value})}
                  className="text-xl font-bold text-gray-800 border-b focus:outline-none focus:border-blue-500"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-800">{selectedNote.title}</h2>
              )}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-300 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <button
                        onClick={startEditing}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => handleDeleteNote(selectedNote.id)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-300 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div 
              className="prose max-w-none cursor-pointer"
              onClick={toggleExpand}
            >
              {isEditing ? (
                <textarea
                  value={editedNote?.content || ''}
                  onChange={(e) => setEditedNote({...editedNote!, content: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={isExpanded ? 10 : 5}
                />
              ) : (
                <p className={`text-gray-700 whitespace-pre-wrap ${isExpanded ? 'text-base' : 'text-sm'}`}>
                  {selectedNote.content}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              {isEditing ? (
                <select
                  value={editedNote?.type || 1}
                  onChange={(e) => setEditedNote({...editedNote!, type: parseInt(e.target.value)})}
                  className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Type 1</option>
                  <option value={2}>Type 2</option>
                </select>
              ) : (
                <span className="text-xs text-gray-500">Type: {selectedNote.type}</span>
              )}
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                      disabled={isSaving}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleEditNote}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <span>Lưu</span>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    Created: {new Date(selectedNote.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
