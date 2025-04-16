'use client'

import { useState, useEffect } from 'react'
import { AppBar } from '@/components/dashboard/app-bar'
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

  useEffect(() => {
    fetchNotes()
  }, [selectedType])

  const fetchNotes = async () => {
      const token = localStorage.getItem('token')
    try {
      setLoading(true)
      console.log(token)
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
    } catch (err: any) {
      console.error('Error fetching notes:', err)
      setError(err.response?.data?.message || 'Failed to fetch notes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async (e: React.FormEvent) => {
      const token = localStorage.getItem("token");
console.log(token)
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post('https://my-backend-app-vkiq.onrender.com/notes', newNote, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNewNote({ title: '', content: '', type: 1 })
      fetchNotes()
    } catch (err: any) {
      console.error('Error creating note:', err)
      setError(err.response?.data?.message || 'Failed to create note')
    }
  }

  return (
    <div className="flex h-screen">
      <AppBar />
      
      <div className="flex-1 bg-gray-100">
        <StatusBar title="Ghi chú" />
        
        <div className="p-6">
          {/* Filter Section */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 rounded ${
                  selectedType === null 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedType(1)}
                className={`px-4 py-2 rounded ${
                  selectedType === 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700'
                }`}
              >
                Type 1
              </button>
              <button
                onClick={() => setSelectedType(2)}
                className={`px-4 py-2 rounded ${
                  selectedType === 2 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700'
                }`}
              >
                Type 2
              </button>
            </div>
          </div>

          {/* Create Note Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                  className="w-full px-3 py-2 border rounded"
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
                  className="w-full px-3 py-2 border rounded"
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
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value={1}>Type 1</option>
                  <option value={2}>Type 2</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
                <div key={note.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
                  <p className="text-gray-600 mb-4">{note.content}</p>
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
    </div>
  )
} 
