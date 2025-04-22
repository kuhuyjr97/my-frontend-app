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
  type?: number
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
      const response = await axios.get(`${baseUrl}/types/${Types.PLAN}`, {
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
      type: newPlan.type
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
        type: 1, 
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
      
      // Chỉ gửi các trường bắt buộc
      const payload = {
        title: editedPlan.title,
        description: editedPlan.description,
        type: editedPlan.type
      }
      
      const response = await axios.put(`${baseUrl}/plans/${editedPlan.id}`, payload, {
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
      <div className="flex-1 bg-[#303a42]">
        <div className="p-6">
          {/* Create Plan Button */}
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "Đang tạo..." : "Tạo kế hoạch mới"}
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
                    : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                }`}
              >
                Tất cả
              </button>
              {planTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(parseInt(type.type))}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    selectedType === parseInt(type.type)
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                  }`}
                >
                  {type.description}
                </button>
              ))}
            </div>
          </div>

          {/* Plans List */}
          <div className="">
            {error && (
              <div className="bg-red-500 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center">Loading...</div>
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="grid grid-cols-12 items-center p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 gap-4"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="col-span-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs inline-block w-full text-center ${
                          plan.type === 1
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {planTypes.find((t) => parseInt(t.type) === plan.type)
                          ?.description || `Type ${plan.type}`}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium">{plan.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 truncate col-span-7">
                      {plan.description}
                    </p>
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
                <DialogTitle>Tạo kế hoạch mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin kế hoạch mới của bạn. Click lưu khi hoàn thành.
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateModalExpanded(!isCreateModalExpanded)}
                className="h-8 w-8"
              >
                {isCreateModalExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tiêu đề
              </label>
              <input
                type="text"
                value={newPlan.title}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nội dung
              </label>
              <textarea
                value={newPlan.description}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, description: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isCreateModalExpanded ? "h-[400px]" : "h-[100px]"
                }`}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={newPlan.type}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, type: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {planTypes.map((type) => (
                  <option key={type.id} value={type.type}>
                    {type.description}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isCreating}
              >
                {isCreating ? (
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
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  "Tạo kế hoạch"
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
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedPlan?.title || ""}
                    onChange={(e) =>
                      setEditedPlan({ ...editedPlan!, title: e.target.value })
                    }
                    className="text-xl font-bold text-gray-800 border-b focus:outline-none focus:border-blue-500 w-full"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedPlan.title}
                  </h2>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditModalExpanded(!isEditModalExpanded)}
                  className="h-8 w-8"
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
            <div
              className="prose max-w-none cursor-pointer"
              onClick={toggleExpand}
            >
              {isEditing ? (
                <textarea
                  value={editedPlan?.description || ""}
                  onChange={(e) =>
                    setEditedPlan({ ...editedPlan!, description: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isEditModalExpanded ? "h-[500px]" : "h-[200px]"
                  }`}
                />
              ) : (
                <p
                  className={`text-gray-700 whitespace-pre-wrap ${
                    isEditModalExpanded ? "text-base" : "text-sm"
                  }`}
                >
                  {selectedPlan.description}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              {isEditing ? (
                <select
                  value={editedPlan?.type || 1}
                  onChange={(e) =>
                    setEditedPlan({
                      ...editedPlan!,
                      type: parseInt(e.target.value),
                    })
                  }
                  className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {planTypes.map((type) => (
                    <option key={type.id} value={type.type}>
                      {type.description}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-gray-500">
                  Type: {planTypes.find(t => parseInt(t.type) === selectedPlan.type)?.description || `Type ${selectedPlan.type}`}
                </span>
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
                      onClick={handleEditPlan}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
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
                  <span className="text-xs text-gray-500">
                    Created: {new Date(selectedPlan.createdAt).toLocaleString()}
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
