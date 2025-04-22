"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, User, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { format, isAfter } from "date-fns";
import { vi } from "date-fns/locale";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
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

interface Task {
  id: number;
  title: string;
  description?: string;
  type?: number;
  startedAt?: string;
  dueTime?: string;
  issuer?: string;
  assigner?: string;
  status?: string;
  updatedAt: string;
  createdAt: string;
}

export default function TasksPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const baseUrl = backendUrl();

  useEffect(() => {
    fetchTasks();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const taskData = {
      title: formData.get("title"),
      description: formData.get("description"),
      type: parseInt(formData.get("type") as string),
      startedAt: formData.get("startedAt"),
      dueTime: formData.get("dueTime"),
      issuer: formData.get("issuer"),
      assigner: formData.get("assigner"),
      status: formData.get("status"),
    };

    try {
      const token = localStorage.getItem("token");
      if (selectedTask) {
        // Update existing task
        await axios.put(`${baseUrl}/tasks/${selectedTask.id}`, taskData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Create new task
        await axios.post(`${baseUrl}/tasks`, taskData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      fetchTasks();
      setShowForm(false);
      setSelectedTask(null);
      setIsEditing(false);
    } catch (err) {
      setError(selectedTask ? "Không thể cập nhật công việc" : "Không thể tạo công việc mới");
    }
  };

  const handleView = (task: Task) => {
    setSelectedTask(task);
    setShowForm(true);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async (taskId: number) => {
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

  const statusLabels = {
    "1": "Chờ thực hiện",
    "2": "Đang thực hiện",
    "3": "Hoàn thành",
    "4": "Quá hạn"
  };

  const statusColors = {
    "1": "bg-yellow-100 text-yellow-800",
    "2": "bg-blue-100 text-blue-800",
    "3": "bg-green-100 text-green-800",
    "4": "bg-red-100 text-red-800"
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedStatus === "all") return true;
    return task.status === selectedStatus;
  });

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Công việc</h1>
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
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              setSelectedTask(null);
              setShowForm(true);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={20} />
            Thêm công việc
          </button>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? (isEditing ? "Chỉnh sửa công việc" : "Chi tiết công việc") : "Thêm công việc mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={selectedTask?.title}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={selectedTask?.description}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Loại</label>
                <input
                  type="number"
                  name="type"
                  required
                  defaultValue={selectedTask?.type}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                <input
                  type="date"
                  name="startedAt"
                  defaultValue={selectedTask?.startedAt?.split('T')[0]}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hạn hoàn thành</label>
                <input
                  type="date"
                  name="dueTime"
                  defaultValue={selectedTask?.dueTime?.split('T')[0]}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Người giao</label>
                <input
                  type="text"
                  name="issuer"
                  defaultValue={selectedTask?.issuer}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Người thực hiện</label>
                <input
                  type="text"
                  name="assigner"
                  defaultValue={selectedTask?.assigner}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                <select
                  name="status"
                  required
                  defaultValue={selectedTask?.status || "1"}
                  disabled={!isEditing}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {selectedTask && !isEditing && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Chỉnh sửa
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {selectedTask ? "Cập nhật" : "Tạo công việc"}
                  </button>
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => (
          <div 
            key={task.id} 
            onClick={() => handleView(task)}
            className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-all cursor-pointer ${
              isOverdue(task.dueTime || "") ? "border-l-4 border-red-500" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{task.title}</h3>
              {task.status && (
                <span className={`px-2 py-1 rounded-full text-sm ${statusColors[task.status as keyof typeof statusColors]}`}>
                  {statusLabels[task.status as keyof typeof statusLabels]}
                </span>
              )}
            </div>
            
            {task.description && (
              <p className="text-gray-600 mb-4">{task.description}</p>
            )}

            <div className="space-y-2">
              {task.startedAt && task.dueTime && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>
                    {format(new Date(task.startedAt), "dd/MM/yyyy", { locale: vi })} -{" "}
                    {format(new Date(task.dueTime), "dd/MM/yyyy", { locale: vi })}
                    {isOverdue(task.dueTime) && (
                      <span className="ml-2 text-red-500">(Quá hạn)</span>
                    )}
                  </span>
                </div>
              )}

              {task.issuer && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User size={16} />
                  <span>Người giao: {task.issuer}</span>
                </div>
              )}

              {task.assigner && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User size={16} />
                  <span>Người thực hiện: {task.assigner}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
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
  );
} 