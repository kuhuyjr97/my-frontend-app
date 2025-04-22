'use client'

import { useState, useEffect } from 'react'
import { Plus, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { backendUrl } from "@/app/baseUrl";
import axios from 'axios'
import { Types, TypeLabels } from "@/app/enums/types";

interface Plan {
  id: number
  title: string
  description?: string
  type: number
  subtype: number
  startedAt?: string
  dueTime?: string
  status?: string
  createdAt: string
}

interface PlanType {
  id: string;
  type: string;
  subtype: string;
  description: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    type: 2,
    subtype: 1,
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateModalExpanded, setIsCreateModalExpanded] = useState(false);
  const [isEditModalExpanded, setIsEditModalExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const baseUrl = backendUrl();

  useEffect(() => {
    fetchPlans()
    fetchPlanTypes();
  }, [selectedType])

  const fetchPlanTypes = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${baseUrl}/types/2`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPlanTypes(response.data);
    } catch (err) {
      console.error("Error fetching plan types:", err);
      setError("Failed to fetch plan types");
    }
  };

  const fetchPlans = async () => {
    const token = localStorage.getItem('token')
    try {
      setLoading(true)
      const url = selectedType 
        ? `${baseUrl}/plans/type/${selectedType}`
        : `${baseUrl}/plans`
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
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
    e.preventDefault()
    setIsCreating(true);
    const token = localStorage.getItem("token")
    
    // Chỉ gửi các trường bắt buộc
    const payload = {
      title: newPlan.title,
      description: newPlan.description,
      type: 2,
      subtype: newPlan.subtype
    }
    
    try {
      await axios.post(`${baseUrl}/plans`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setNewPlan({ 
        title: '', 
        description: '', 
        type: 2,
        subtype: newPlan.subtype,
        startedAt: '',
        dueTime: '',
        status: 'pending'
      })
      fetchPlans()
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      console.error('Error creating plan:', err)
      setError('Failed to create plan')
    } finally {
      setIsCreating(false);
    }
  }

  const handleDeletePlan = async (planId: number) => {
    const token = localStorage.getItem("token")
    try {
      await axios.delete(`${baseUrl}/plans/${planId}`, {
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
      
      const payload = {
        title: editedPlan.title,
        description: editedPlan.description,
        type: 2,
        subtype: 201
      }

      console.log('payload', payload)
      
      await axios.patch(`${baseUrl}/plans/${editedPlan.id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      closeModal()
      await fetchPlans()
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
      <div className="flex-1 bg-[#303a42] overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Create Plan Button */}
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
              disabled={isCreating}
            >
              <Plus className="h-4 w-4" />
              <span>{isCreating ? "Đang tạo..." : "Tạo kế hoạch mới"}</span>
            </Button>
          </div>

          {/* Filter Section */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  selectedType === null
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                Tất cả
              </button>
              {planTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(parseInt(type.subtype))}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    selectedType === parseInt(type.subtype)
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {type.description}
                </button>
              ))}
            </div>
          </div>

          {/* Plans List */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center text-white/80">Loading...</div>
            ) : (
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openPlanModal(plan)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{plan.title}</h3>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {plan.description}
                        </p>
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <time dateTime={plan.createdAt}>
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          plan.type === 1
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {planTypes.find((t) => parseInt(t.subtype) === plan.subtype)
                          ?.description || `Type ${plan.subtype}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Plan Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent
          className={`sm:max-w-[425px] ${
            isCreateModalExpanded ? "sm:max-w-[800px]" : ""
          }`}
        >
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Tạo kế hoạch mới
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-gray-500">
                  Nhập thông tin kế hoạch mới của bạn
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateModalExpanded(!isCreateModalExpanded)}
                className="h-8 w-8 hover:bg-gray-100 rounded-full"
              >
                {isCreateModalExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiêu đề
              </label>
              <input
                type="text"
                value={newPlan.title}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, title: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nội dung
              </label>
              <textarea
                value={newPlan.description}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, description: e.target.value })
                }
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none ${
                  isCreateModalExpanded ? "h-[400px]" : "h-[100px]"
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại kế hoạch
              </label>
              <select
                value={newPlan.subtype}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, subtype: parseInt(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {planTypes.map((type) => (
                  <option key={type.id} value={type.subtype}>
                    {type.description}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Tạo kế hoạch</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl ${
              isEditModalExpanded ? "w-[90%] h-[90vh]" : "max-w-lg w-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedPlan?.title || ""}
                    onChange={(e) =>
                      setEditedPlan({ ...editedPlan!, title: e.target.value })
                    }
                    className="text-xl font-bold w-full px-0 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:ring-0"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {selectedPlan.title}
                  </h2>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditModalExpanded(!isEditModalExpanded)}
                  className="h-8 w-8 hover:bg-gray-100 rounded-full"
                >
                  {isEditModalExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-300 p-1"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
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
                        onClick={() => handleDeletePlan(selectedPlan.id)}
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
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              {isEditing ? (
                <textarea
                  value={editedPlan?.description || ""}
                  onChange={(e) =>
                    setEditedPlan({ ...editedPlan!, description: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    isEditModalExpanded ? "h-[500px]" : "h-[200px]"
                  }`}
                />
              ) : (
                <p className={`text-gray-700 whitespace-pre-wrap ${
                  isEditModalExpanded ? "text-base" : "text-sm"
                }`}>
                  {selectedPlan.description}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              {isEditing ? (
                <select
                  value={editedPlan?.subtype || 1}
                  onChange={(e) =>
                    setEditedPlan({
                      ...editedPlan!,
                      subtype: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {planTypes.map((type) => (
                    <option key={type.id} value={type.subtype}>
                      {type.description}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-gray-500">
                  {planTypes.find(t => parseInt(t.subtype) === selectedPlan.subtype)?.description || `Type ${selectedPlan.subtype}`}
                </span>
              )}
              <div className="flex items-center space-x-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      disabled={isSaving}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleEditPlan}
                      className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center transition-colors disabled:opacity-50"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <span>Lưu</span>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    {new Date(selectedPlan.createdAt).toLocaleString()}
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
