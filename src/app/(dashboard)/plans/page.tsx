'use client'

import { useState, useEffect } from 'react'
import { AppBar } from '@/components/dashboard/app-bar'
import { StatusBar } from '@/components/dashboard/status-bar'
import axios from 'axios'

interface Plan {
  id: number
  title: string
  description?: string
  type?: number
  startedAt?: string
  dueTime?: string
  status?: string
  createdAt: string
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    type: 1,
    startedAt: '',
    dueTime: '',
    status: 'pending'
  })
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPlan, setEditedPlan] = useState<Plan | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [selectedType])

  const fetchPlans = async () => {
    const token = localStorage.getItem('token')
    try {
      setLoading(true)
      const url = selectedType 
        ? `https://my-backend-app-vkiq.onrender.com/plans/type/${selectedType}`
        : 'https://my-backend-app-vkiq.onrender.com/plans'
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      console.log('Plans data received:', response.data)
      setPlans(response.data)
      setError('')
    } catch (err: unknown) {
      console.error("Error fetching plans:", err)
      setError('Failed to fetch plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    const token = localStorage.getItem("token")
    e.preventDefault()
    
    // Chỉ gửi các trường bắt buộc
    const payload = {
      title: newPlan.title,
      description: newPlan.description,
      type: newPlan.type
    }
    
    try {
      await axios.post('https://my-backend-app-vkiq.onrender.com/plans', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNewPlan({ 
        title: '', 
        description: '', 
        type: 1, 
        startedAt: '',
        dueTime: '',
        status: 'pending'
      })
      fetchPlans()
    } catch (err: unknown) {
      console.error('Error creating plan:', err)
      setError('Failed to create plan')
    }
  }

  const handleDeletePlan = async (planId: number) => {
    const token = localStorage.getItem("token")
    try {
      await axios.delete(`https://my-backend-app-vkiq.onrender.com/plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      closeModal()
      fetchPlans()
    } catch (err: unknown) {
      console.error('Error deleting plan:', err)
      setError('Failed to delete plan')
    }
  }

  const handleEditPlan = async () => {
    if (!editedPlan) return
    
    const token = localStorage.getItem("token")
    try {
      setIsSaving(true)
      
      // Chỉ gửi các trường bắt buộc
      const payload = {
        title: editedPlan.title,
        description: editedPlan.description,
        type: editedPlan.type
      }
      
      const response = await axios.put(`https://my-backend-app-vkiq.onrender.com/plans/${editedPlan.id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (response.status === 200) {
        closeModal()
        await fetchPlans()
      }
    } catch (err: unknown) {
      console.error('Error editing plan:', err)
      setError('Failed to edit plan')
    } finally {
      setIsSaving(false)
    }
  }

  const openPlanModal = (plan: Plan) => {
    console.log('Opening plan modal with data:', plan)
    setSelectedPlan(plan)
    setEditedPlan({...plan})
    setIsModalOpen(true)
    setIsExpanded(false)
    setIsEditing(false)
    setShowMenu(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedPlan(null)
    setEditedPlan(null)
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
      <AppBar />
      
      <div className="flex-1 bg-gray-100">
        <StatusBar title="Kế hoạch" />
        
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

          {/* Create Plan Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 transform transition-all duration-300 hover:shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Tạo kế hoạch mới</h2>
            <form onSubmit={handleCreatePlan}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({...newPlan, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Mô tả
                </label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Loại
                  </label>
                  <select
                    value={newPlan.type}
                    onChange={(e) => setNewPlan({...newPlan, type: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  >
                    <option value={1}>Type 1</option>
                    <option value={2}>Type 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={newPlan.status}
                    onChange={(e) => setNewPlan({...newPlan, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  >
                    <option value="pending">Đang chờ</option>
                    <option value="in-progress">Đang thực hiện</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={newPlan.startedAt}
                    onChange={(e) => setNewPlan({...newPlan, startedAt: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hạn hoàn thành
                  </label>
                  <input
                    type="datetime-local"
                    value={newPlan.dueTime}
                    onChange={(e) => setNewPlan({...newPlan, dueTime: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
              >
                Tạo kế hoạch
              </button>
            </form>
          </div>

          {/* Plans List */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id} 
                  className="bg-white rounded-lg shadow p-6 transform transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                  onClick={() => openPlanModal(plan)}
                >
                  <h3 className="text-lg font-semibold mb-2">{plan.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{plan.description || 'Không có mô tả'}</p>
                  <div className="flex flex-wrap justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      plan.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      plan.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      plan.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {plan.status === 'completed' ? 'Hoàn thành' :
                       plan.status === 'in-progress' ? 'Đang thực hiện' :
                       plan.status === 'cancelled' ? 'Đã hủy' : 'Đang chờ'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {plan.dueTime ? `Hạn: ${new Date(plan.dueTime).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div 
            className={`bg-white rounded-lg shadow-2xl mx-4 transform transition-all duration-300 animate-fadeIn ${
              isExpanded ? 'w-[90%] h-[90vh] overflow-auto' : 'max-w-2xl w-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start px-6 pt-6 border-b pb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editedPlan?.title || ''}
                  onChange={(e) => setEditedPlan({...editedPlan!, title: e.target.value})}
                  className="text-2xl font-bold text-gray-800 border-b w-full focus:outline-none focus:border-blue-500"
                  placeholder="Tiêu đề kế hoạch"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-800">{selectedPlan.title}</h2>
              )}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-300 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <button
                        onClick={startEditing}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Chỉnh sửa
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeletePlan(selectedPlan.id)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Xóa
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-300 p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Mô tả:</label>
                    <textarea
                      value={editedPlan?.description || ''}
                      onChange={(e) => setEditedPlan({...editedPlan!, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={isExpanded ? 10 : 5}
                      placeholder="Nhập mô tả chi tiết cho kế hoạch..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Loại:</label>
                      <select
                        value={editedPlan?.type || 1}
                        onChange={(e) => setEditedPlan({...editedPlan!, type: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>Type 1</option>
                        <option value={2}>Type 2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Trạng thái:</label>
                      <select
                        value={editedPlan?.status || 'pending'}
                        onChange={(e) => setEditedPlan({...editedPlan!, status: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Đang chờ</option>
                        <option value="in-progress">Đang thực hiện</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Ngày bắt đầu:</label>
                      <input
                        type="datetime-local"
                        value={editedPlan?.startedAt || ''}
                        onChange={(e) => setEditedPlan({...editedPlan!, startedAt: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Hạn hoàn thành:</label>
                      <input
                        type="datetime-local"
                        value={editedPlan?.dueTime || ''}
                        onChange={(e) => setEditedPlan({...editedPlan!, dueTime: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {!isEditing && (
                    <div 
                      className="prose max-w-none"
                      onClick={toggleExpand}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-700 text-base font-medium">Mô tả</h3>
                        <button 
                          className="text-xs text-blue-500 hover:text-blue-700 flex items-center"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            toggleExpand();
                          }}
                        >
                          {isExpanded ? 'Thu gọn' : 'Mở rộng'} 
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d={isExpanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                        <p className={`text-gray-700 whitespace-pre-wrap ${isExpanded ? 'text-base leading-relaxed' : 'text-sm'} min-h-[50px]`}>
                          {selectedPlan.description || 'Không có mô tả'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin cơ bản</h4>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-gray-600 text-sm">Loại:</span>
                              <span className="font-medium">{selectedPlan.type === 1 ? 'Type 1' : 'Type 2'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-gray-600 text-sm">Trạng thái:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                selectedPlan.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                selectedPlan.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                selectedPlan.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {selectedPlan.status === 'completed' ? 'Hoàn thành' :
                                selectedPlan.status === 'in-progress' ? 'Đang thực hiện' :
                                selectedPlan.status === 'cancelled' ? 'Đã hủy' : 'Đang chờ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Thời gian</h4>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                              <span className="text-gray-600 text-sm">Ngày bắt đầu:</span>
                              <span className="font-medium">{selectedPlan.startedAt ? new Date(selectedPlan.startedAt).toLocaleString() : 'Chưa thiết lập'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-gray-600 text-sm">Hạn hoàn thành:</span>
                              <span className="font-medium">{selectedPlan.dueTime ? new Date(selectedPlan.dueTime).toLocaleString() : 'Chưa thiết lập'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 mr-2"
                      disabled={isSaving}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleEditPlan}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
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
                  <div className="text-sm text-gray-500">
                    Tạo lúc: {new Date(selectedPlan.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
