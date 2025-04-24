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
    startedAt: new Date().toISOString().split('T')[0],
    dueTime: new Date().toISOString().split('T')[0],
    status: Status.NOT_STARTED
  });
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState<Plan | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalExpanded, setIsEditModalExpanded] = useState(false);

  const baseUrl = backendUrl();

  const toggleExpand = () => {
    setIsEditModalExpanded(!isEditModalExpanded);
  };

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
        startedAt: new Date().toISOString().split('T')[0],
        dueTime: new Date().toISOString().split('T')[0],
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
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Plans</h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage and track your plans
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectGroup>
                    <SelectItem value="all" className="text-gray-100 hover:bg-gray-700">All</SelectItem>
                    {Object.entries(StatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-gray-100 hover:bg-gray-700">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Plan
              </Button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-800 rounded-lg shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startedAt}
                    onChange={(e) => setFormData({ ...formData, startedAt: e.target.value })}
                    className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <Select
                    value={formData.status.toString()}
                    onValueChange={(value) => setFormData({ ...formData, status: parseInt(value) })}
                  >
                    <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectGroup>
                        {Object.entries(StatusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-gray-100 hover:bg-gray-700">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="text-gray-300 border-gray-700 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Plan
                </Button>
              </div>
            </form>
          )}

          {/* Plans List */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-900/50 border-l-4 border-red-500 p-4 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-100">No plans</h3>
                <p className="mt-1 text-sm text-gray-400">Start by creating a new plan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => openPlanModal(plan)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-100 mb-1">{plan.title}</h3>
                          <p className="text-sm text-gray-400 mb-2">
                            {format(new Date(plan.startedAt), "dd/MM/yyyy", { locale: vi })} - {format(new Date(plan.dueTime), "dd/MM/yyyy", { locale: vi })}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            StatusColors[plan.status]
                          }`}
                        >
                          {StatusLabels[plan.status]}
                        </span>
                      </div>
                      <p className="text-gray-300 line-clamp-3">{plan.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Plan Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-gray-800 rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl ${
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
                    onChange={(e) => setEditedPlan({ ...editedPlan!, title: e.target.value })}
                    className="text-xl font-bold text-gray-100 border-b border-gray-700 bg-transparent focus:outline-none focus:border-blue-500 w-full"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-100">{selectedPlan.title}</h2>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditModalExpanded(!isEditModalExpanded)}
                  className="h-8 w-8 text-gray-400 hover:text-gray-100"
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
                    className="text-gray-400 hover:text-gray-100 transition-colors duration-300 p-1"
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
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-700">
                      <button
                        onClick={startEditing}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(selectedPlan.id)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-100 transition-colors duration-300 p-1"
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
            <div className="prose max-w-none cursor-pointer" onClick={toggleExpand}>
              {isEditing ? (
                <textarea
                  value={editedPlan?.description || ""}
                  onChange={(e) => setEditedPlan({ ...editedPlan!, description: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isEditModalExpanded ? "h-[500px]" : "h-[200px]"
                  }`}
                />
              ) : (
                <p
                  className={`text-gray-300 whitespace-pre-wrap ${
                    isEditModalExpanded ? "text-base" : "text-sm"
                  }`}
                >
                  {selectedPlan.description}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              {isEditing ? (
                <>
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={editedPlan?.startedAt ? new Date(editedPlan.startedAt).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditedPlan({ ...editedPlan!, startedAt: e.target.value })}
                        className="px-3 py-1 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editedPlan?.dueTime ? new Date(editedPlan.dueTime).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditedPlan({ ...editedPlan!, dueTime: e.target.value })}
                        className="px-3 py-1 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <Select
                    value={editedPlan?.status.toString() || "0"}
                    onValueChange={(value) => setEditedPlan({ ...editedPlan!, status: parseInt(value) })}
                  >
                    <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-gray-100">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectGroup>
                        {Object.entries(StatusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-gray-100 hover:bg-gray-700">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <span className="text-xs text-gray-400">
                  Status: {StatusLabels[selectedPlan.status]}
                </span>
              )}
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-sm text-gray-400 hover:text-gray-100"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditPlan}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
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
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save</span>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">
                    Created: {format(new Date(selectedPlan.startedAt), "dd/MM/yyyy", { locale: vi })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
