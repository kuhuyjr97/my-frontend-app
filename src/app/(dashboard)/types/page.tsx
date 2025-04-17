'use client'

import { useState } from 'react'
import { StatusBar } from '@/components/dashboard/status-bar'
import axios from 'axios'

export const BaseType = {
  NOTE: 0,
  PLAN: 1,
  TASK: 2,
  SAVING: 3,
  INCOME: 4,
  EXPENSE: 5,
  UNKNOWN: 99,
} as const;

export type BaseType = (typeof BaseType)[keyof typeof BaseType];

export const BaseTypeLabel = {
  [BaseType.NOTE]: 'note',
  [BaseType.PLAN]: 'plan',
  [BaseType.TASK]: 'task',
  [BaseType.SAVING]: 'saving',
  [BaseType.INCOME]: 'income',
  [BaseType.EXPENSE]: 'expense',
  [BaseType.UNKNOWN]: 'unknown',
} as const;

interface Type {
  id: number
  type: BaseType
  subtype: string
  description: string
}

export default function TypesPage() {
  const [types, setTypes] = useState<Type[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newType, setNewType] = useState({
    type: BaseType.NOTE,
    subtype: '',
    description: ''
  })

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await axios.post('https://my-backend-app-vkiq.onrender.com/types', newType, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNewType({ type: BaseType.NOTE, subtype: '', description: '' })
      fetchTypes()
    } catch (err) {
      console.error('Error creating type:', err)
      setError('Failed to create type')
    }
  }

  const fetchTypes = async () => {
    const token = localStorage.getItem('token')
    try {
      setLoading(true)
      const response = await axios.get('https://my-backend-app-vkiq.onrender.com/types', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setTypes(response.data)
      setError('')
    } catch (err) {
      console.error('Error fetching types:', err)
      setError('Failed to fetch types')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 bg-gray-100">
        <StatusBar title="Loại" />
        
        <div className="p-6">
          {/* Create Type Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Thêm loại mới</h2>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại
                </label>
                <select
                  value={newType.type}
                  onChange={(e) => setNewType({...newType, type: parseInt(e.target.value) as BaseType})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {Object.entries(BaseType).map(([key, value]) => (
                    <option key={key} value={value}>
                      {BaseTypeLabel[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phân loại
                </label>
                <input
                  type="text"
                  value={newType.subtype}
                  onChange={(e) => setNewType({...newType, subtype: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={newType.description}
                  onChange={(e) => setNewType({...newType, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Thêm
              </button>
            </form>
          </div>

          {/* Types List */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {types.map((type) => (
                <div 
                  key={type.id} 
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{BaseTypeLabel[type.type]}</h3>
                    <span className="text-sm text-gray-500">{type.subtype}</span>
                  </div>
                  <p className="text-gray-600">{type.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
