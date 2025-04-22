"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Status, StatusLabels, StatusColors } from "@/app/enums/status";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  title: string;
  description: string;
  type: number;
  startedAt: string;
  dueTime: string;
  status: Status;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: 1,
    startedAt: "",
    dueTime: "",
    status: Status.NOT_STARTED
  });
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState<Plan | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const baseUrl = backendUrl();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/plans`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPlans(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching plans:", err);
      setError("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${baseUrl}/plans`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        type: 1,
        startedAt: "",
        dueTime: "",
        status: Status.NOT_STARTED
      });
      fetchPlans();
    } catch (err) {
      console.error("Error creating plan:", err);
      setError("Failed to create plan");
    }
  };

  const handleEditPlan = async () => {
    if (!editedPlan) return;
    
    const token = localStorage.getItem("token");
    try {
      setIsSaving(true);
      await axios.patch(`${baseUrl}/plans/${editedPlan.id}`, editedPlan, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      closeModal();
      await fetchPlans();
    } catch (err) {
      console.error("Error editing plan:", err);
      setError("Failed to edit plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${baseUrl}/plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      closeModal();
      fetchPlans();
    } catch (err) {
      console.error("Error deleting plan:", err);
      setError("Failed to delete plan");
    }
  };

  const openPlanModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setEditedPlan({...plan});
    setIsModalOpen(true);
    setIsExpanded(false);
    setIsEditing(false);
    setShowMenu(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
    setEditedPlan(null);
    setIsExpanded(false);
    setIsEditing(false);
    setShowMenu(false);
  };

  const startEditing = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const filteredPlans = selectedStatus === "all" 
    ? plans 
    : plans.filter(plan => plan.status.toString() === selectedStatus);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kế hoạch</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedStatus}
            onValueChange={setSelectedStatus}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Tất cả</SelectItem>
                {Object.entries(StatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={20} />
            Thêm kế hoạch
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                value={formData.startedAt}
                onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hạn hoàn thành</label>
              <input
                type="date"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trạng thái</label>
              <Select
                value={formData.status.toString()}
                onValueChange={(value) => setFormData({ ...formData, status: parseInt(value) as Status })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(StatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tạo kế hoạch
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
          <div 
            key={plan.id} 
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-all"
            onClick={() => openPlanModal(plan)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{plan.title}</h3>
              <span className={`px-2 py-1 rounded-full text-sm ${StatusColors[plan.status]}`}>
                {StatusLabels[plan.status]}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{plan.description}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={16} />
              <span>
                {format(new Date(plan.startedAt), "dd/MM/yyyy", { locale: vi })} -{" "}
                {format(new Date(plan.dueTime), "dd/MM/yyyy", { locale: vi })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl ${
              isExpanded ? "w-[90%] h-[90vh]" : "max-w-lg w-full"
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
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8"
                >
                  {isExpanded ? (
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
                <div className="space-y-4">
                  <textarea
                    value={editedPlan?.description || ""}
                    onChange={(e) =>
                      setEditedPlan({ ...editedPlan!, description: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      isExpanded ? "h-[500px]" : "h-[200px]"
                    }`}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                      <input
                        type="date"
                        value={editedPlan?.startedAt || ""}
                        onChange={(e) =>
                          setEditedPlan({ ...editedPlan!, startedAt: e.target.value })
                        }
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hạn hoàn thành</label>
                      <input
                        type="date"
                        value={editedPlan?.dueTime || ""}
                        onChange={(e) =>
                          setEditedPlan({ ...editedPlan!, dueTime: e.target.value })
                        }
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Trạng thái</label>
                      <Select
                        value={editedPlan?.status.toString() || ""}
                        onValueChange={(value) =>
                          setEditedPlan({ ...editedPlan!, status: parseInt(value) as Status })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Object.entries(StatusLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedPlan.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>
                      {format(new Date(selectedPlan.startedAt), "dd/MM/yyyy", { locale: vi })} -{" "}
                      {format(new Date(selectedPlan.dueTime), "dd/MM/yyyy", { locale: vi })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-sm ${StatusColors[selectedPlan.status]}`}>
                      {StatusLabels[selectedPlan.status]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleEditPlan}
                    disabled={isSaving}
                  >
                    {isSaving ? "Đang lưu..." : "Lưu"}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-gray-500">
                  {format(new Date(selectedPlan.startedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
