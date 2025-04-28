"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, User, Clock, CheckCircle2, AlertCircle, Trash2, Minimize2, Maximize2 } from "lucide-react";
import { format, isAfter } from "date-fns";
import { vi } from "date-fns/locale";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Status, StatusLabels, StatusColors } from "@/app/enums/status";
import { Types } from "@/app/enums/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Task {
  id: string;
  title: string;
  description: string;
  type: number;
  startedAt: string;
  dueTime: string;
  issuer: string;
  assigner: string;
  status: Status;
  updatedAt: string;
}

interface Type {
  id: number;
  subType: string;
  description: string;
}

export default function TasksPage() {
  const [selectedStatus, setSelectedStatus] = useState<"all" | number>("all");
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taskTypes, setTaskTypes] = useState<Type[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSubType, setSelectedSubType] = useState<number>(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: 1,
    startedAt: new Date().toISOString().split('T')[0],
    dueTime: new Date().toISOString().split('T')[0],
    status: 1
  });
  const baseUrl = backendUrl();
  const router = useRouter();
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.removeItem("token");
      router.push("/login");
      return;
    }

   try {
    const check = await axios.get(`${baseUrl}/auth/check`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!check.data) {
      localStorage.removeItem("token");
      router.push("/login");
      return;
    }
   } catch (error) {
    console.log('error',error);
    localStorage.removeItem("token");
    console.log('navifte to login');
    router.push("/login");
    return;
   }
 
  }
  fetchTasks();
  fetchTaskTypes();
  fetchData();
}, []);


  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${baseUrl}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTasks(response.data);
      setLoading(false);
    } catch (err) {
      setError("Không thể tải danh sách công việc");
      setLoading(false);
    }
  };

  const fetchTaskTypes = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${baseUrl}/types/${Types.TASK}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTaskTypes(response.data);
    } catch (err) {
      console.error("Error fetching task types:", err);
      setError("Failed to fetch task types");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${baseUrl}/tasks`, formData, {
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
        status: 1
      });
      fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      setError("Failed to create task");
    }
  };

  const handleView = (task: Task) => {
    setSelectedTask(task);
    setEditedTask({ ...task });
    setSelectedSubType(task.type);
    setIsModalOpen(true);
    setIsExpanded(false);
    setIsEditing(false);
    setShowMenu(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setEditedTask(null);
    setIsExpanded(false);
    setIsEditing(false);
    setShowMenu(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const startEditing = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleEditTask = async () => {
    if (!editedTask) return;

    const token = localStorage.getItem("token");
    try {
      setIsSaving(true);
      await axios.patch(
        `${baseUrl}/tasks/${editedTask.id}`,
        {
          title: editedTask.title,
          description: editedTask.description,
          type: editedTask.type,
          startedAt: new Date(editedTask.startedAt),
          dueTime: new Date(editedTask.dueTime),
          status: String(editedTask.status),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      closeModal();
      await fetchTasks();
    } catch (err: unknown) {
      console.error("Error editing task:", err);
      setError("Failed to edit task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${baseUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchTasks();
      setShowForm(false);
      setSelectedTask(null);
    } catch (err) {
      setError("Không thể xóa công việc");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedTask(null);
    setIsEditing(false);
  };

  const isOverdue = (dueTime: string) => {
    return isAfter(new Date(), new Date(dueTime));
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      const matchesType = selectedType === "all" || task.type === Number(selectedType);
      const matchesStatus = selectedStatus === "all" || Number(task.status) === selectedStatus;
      return matchesType && matchesStatus;
    });
  };

  if (loading) return (
    <div className="flex h-screen bg-gray-900 items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  if (error) return (
    <div className="flex h-screen bg-gray-900 items-center justify-center">
      <div className="bg-red-900/50 border-l-4 border-red-500 p-4 rounded-lg">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Tasks</h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage and track your tasks
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value);
                  if (value !== "all") {
                    setSelectedSubType(parseInt(value));
                  }
                }}
              >
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectGroup>
                    <SelectItem value="all" className="text-gray-100 hover:bg-gray-700">All Types</SelectItem>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.id} value={type.subType} className="text-gray-100 hover:bg-gray-700">
                        {type.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus === "all" ? "all" : selectedStatus.toString()}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedStatus("all");
                  } else {
                    setSelectedStatus(Number(value));
                  }
                }}
              >
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectGroup>
                    <SelectItem value="all" className="text-gray-100 hover:bg-gray-700">All Status</SelectItem>
                    <SelectItem value="1" className="text-gray-100 hover:bg-gray-700">{StatusLabels[1]}</SelectItem>
                    <SelectItem value="2" className="text-gray-100 hover:bg-gray-700">{StatusLabels[2]}</SelectItem>
                    <SelectItem value="3" className="text-gray-100 hover:bg-gray-700">{StatusLabels[3]}</SelectItem>
                    <SelectItem value="4" className="text-gray-100 hover:bg-gray-700">{StatusLabels[4]}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-100">{getFilteredTasks().length}</span>
                <span>tasks</span>
              </span>
              {selectedType !== "all" && (
                <span className="flex items-center gap-1">
                  <span>type:</span>
                  <span className="font-medium text-gray-100">
                    {taskTypes.find(t => t.subType === selectedType)?.description}
                  </span>
                </span>
              )}
              {selectedStatus !== "all" && (
                <span className="flex items-center gap-1">
                  <span>status:</span>
                  <span className="font-medium text-gray-100">
                    {StatusLabels[selectedStatus as keyof typeof StatusLabels]}
                  </span>
                </span>
              )}
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <Select
                    value={selectedSubType.toString()}
                    onValueChange={(value) => {
                      const subType = parseInt(value);
                      setSelectedSubType(subType);
                      setFormData({ ...formData, type: subType });
                    }}
                  >
                    <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
                      <SelectValue>
                        {taskTypes.find(type => parseInt(type.subType) === selectedSubType)?.description || "Select type"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectGroup>
                        {taskTypes.map((type) => (
                          <SelectItem 
                            key={type.id} 
                            value={type.subType}
                            className="text-gray-100 hover:bg-gray-700"
                          >
                            {type.description}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
                    value={selectedStatus === "all" ? "all" : selectedStatus.toString()}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedStatus("all");
                      } else {
                        setSelectedStatus(Number(value));
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectGroup>
                        <SelectItem value="all" className="text-gray-100 hover:bg-gray-700">All Status</SelectItem>
                        <SelectItem value="1" className="text-gray-100 hover:bg-gray-700">{StatusLabels[1]}</SelectItem>
                        <SelectItem value="2" className="text-gray-100 hover:bg-gray-700">{StatusLabels[2]}</SelectItem>
                        <SelectItem value="3" className="text-gray-100 hover:bg-gray-700">{StatusLabels[3]}</SelectItem>
                        <SelectItem value="4" className="text-gray-100 hover:bg-gray-700">{StatusLabels[4]}</SelectItem>
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
                  Create Task
                </Button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredTasks().map((task) => (
              <div 
                key={task.id} 
                onClick={() => handleView(task)}
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-100">{task.title}</h3>
                  {task.status && (
                    <span className={`px-2 py-1 rounded-full text-sm ${StatusColors[task.status]}`}>
                      {StatusLabels[task.status]}
                    </span>
                  )}
                </div>
                
                {task.description && (
                  <p className="text-gray-400 mb-4">{task.description}</p>
                )}

                <div className="space-y-2">
                  {task.startedAt && task.dueTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar size={16} />
                      <span>
                        {format(new Date(task.startedAt), "dd/MM/yyyy", { locale: vi })} -{" "}
                        {format(new Date(task.dueTime), "dd/MM/yyyy", { locale: vi })}
                        {isOverdue(task.dueTime) && (
                          <span className="ml-2 text-red-500">(Overdue)</span>
                        )}
                      </span>
                    </div>
                  )}

                  {task.issuer && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User size={16} />
                      <span>Người giao: {task.issuer}</span>
                    </div>
                  )}

                  {task.assigner && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User size={16} />
                      <span>Người thực hiện: {task.assigner}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={16} />
                    <span>
                      Cập nhật: {format(new Date(task.updatedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-gray-800 rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl ${
              isExpanded ? "w-[90%] h-[90vh]" : "max-w-lg w-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTask?.title || ""}
                    onChange={(e) => setEditedTask({ ...editedTask!, title: e.target.value })}
                    className="text-xl font-bold text-gray-100 border-b border-gray-700 bg-transparent focus:outline-none focus:border-blue-500 w-full"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-100">{selectedTask.title}</h2>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 text-gray-400 hover:text-gray-100"
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
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => handleDelete(selectedTask.id)}
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

            <div className="prose max-w-none">
              {isEditing ? (
                <textarea
                  value={editedTask?.description || ""}
                  onChange={(e) => setEditedTask({ ...editedTask!, description: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isExpanded ? "h-[500px]" : "h-[200px]"
                  }`}
                />
              ) : (
                <p
                  className={`text-gray-300 whitespace-pre-wrap ${
                    isExpanded ? "text-base" : "text-sm"
                  }`}
                >
                  {selectedTask.description}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                    <Select
                      value={editedTask?.type.toString()}
                      onValueChange={(value) => {
                        const type = parseInt(value);
                        setSelectedSubType(type);
                        setEditedTask({ ...editedTask!, type });
                      }}
                    >
                      <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
                        <SelectValue>
                          {taskTypes.find(type => parseInt(type.subType) === editedTask?.type)?.description || "Select type"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectGroup>
                          {taskTypes.map((type) => (
                            <SelectItem 
                              key={type.id} 
                              value={type.subType}
                              className="text-gray-100 hover:bg-gray-700"
                            >
                              {type.description}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <Select
                      value={editedTask?.status.toString() || "1"}
                      onValueChange={(value) => setEditedTask({ ...editedTask!, status: parseInt(value) })}
                    >
                      <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
                        <SelectValue>
                          {StatusLabels[editedTask?.status || 1]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectGroup>
                          <SelectItem value="1" className="text-gray-100 hover:bg-gray-700">Not Started</SelectItem>
                          <SelectItem value="2" className="text-gray-100 hover:bg-gray-700">In Progress</SelectItem>
                          <SelectItem value="3" className="text-gray-100 hover:bg-gray-700">Completed</SelectItem>
                          <SelectItem value="4" className="text-gray-100 hover:bg-gray-700">Overdue</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editedTask?.startedAt?.split('T')[0] || ""}
                      onChange={(e) => setEditedTask({ ...editedTask!, startedAt: e.target.value })}
                      className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={editedTask?.dueTime?.split('T')[0] || ""}
                      onChange={(e) => setEditedTask({ ...editedTask!, dueTime: e.target.value })}
                      className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar size={16} />
                    <span>
                      {format(new Date(selectedTask.startedAt), "dd/MM/yyyy", { locale: vi })} -{" "}
                      {format(new Date(selectedTask.dueTime), "dd/MM/yyyy", { locale: vi })}
                      {isOverdue(selectedTask.dueTime) && (
                        <span className="ml-2 text-red-500">(Overdue)</span>
                      )}
                    </span>
                  </div>
                  {selectedTask.issuer && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User size={16} />
                      <span>Người giao: {selectedTask.issuer}</span>
                    </div>
                  )}
                  {selectedTask.assigner && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User size={16} />
                      <span>Người thực hiện: {selectedTask.assigner}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={16} />
                    <span>
                      Cập nhật: {format(new Date(selectedTask.updatedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
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
                    onClick={handleEditTask}
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
                  Created: {format(new Date(selectedTask.startedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 