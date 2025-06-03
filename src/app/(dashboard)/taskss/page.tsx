"use client";

import { customStyle } from "@/app/style/custom-style";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  User,
  Clock,
  Minimize2,
  Maximize2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

interface SubTask {
  id: string;
  title: string;
  content: string;
  progress: number;
  status: "completed" | "in_progress" | "not_started";
}

interface Task {
  id: string;
  title: string;
  description: string;
  content?: string;
  dueDate: string;
  status: "released" | "testing" | "doing" | "preparing" | "not_started";
  subtasks: SubTask[];
  updatedAt?: string;
  progress?: number | null;
}

const statusConfig = {
  released: { label: "リリース済（本番に反映）", color: "bg-green-500" },
  testing: { label: "テスト中（ステージングに反映）", color: "bg-blue-500" },
  doing: { label: "開発中", color: "bg-yellow-500" },
  preparing: { label: "準備中", color: "bg-orange-500" },
  not_started: { label: "未着手", color: "bg-gray-500" },
};

function SubTaskCard({
  subtask,
  index,
  onClick,
}: {
  subtask: SubTask;
  index: number;
  onClick: () => void;
}) {
  const gradientColors = [
    "from-green-200 via-green-100 to-green-200 border-green-300",
    "from-blue-200 via-blue-100 to-blue-200 border-blue-300",
  ];

  const progressColor = subtask.progress >= 70 ? "bg-green-800" : "bg-gray-700";

  return (
    <Card
      className={`h-32 bg-gradient-to-br ${
        gradientColors[index % 2]
      } border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:brightness-105`}
      onClick={onClick}
    >
      <CardContent className="p-3 -mt-5">
        <div className="space-y-2">
          <h4 className="text-sm font-medium truncate">{subtask.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {subtask.content}
          </p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium">{subtask.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
                style={{ width: `${subtask.progress}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({
  task,
  onTaskClick,
  onSubTaskClick,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onSubTaskClick: (subtask: SubTask) => void;
}) {
  const statusColor = statusConfig[task.status].color;

  return (
    <div className="w-full space-y-3 mb-4">
      {/* Main Task Card */}
      <Card
        className="border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => onTaskClick(task)}
      >
        <CardHeader className="-mt-4">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {task.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 -mt-4">
          <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
            {task.description}
          </p>

          <div className="flex items-center gap-4  text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{task.dueDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtasks */}
      <div className="grid grid-cols-2 gap-3">
        {task.subtasks.map((subtask, index) => (
          <SubTaskCard
            key={subtask.id}
            subtask={subtask}
            index={index}
            onClick={() => onSubTaskClick(subtask)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskSection({
  status,
  tasks,
  onTaskView,
}: {
  status: keyof typeof statusConfig;
  tasks: Task[];
  onTaskView: (task: Task) => void;
}) {
  const config = statusConfig[status];
  const filteredTasks = tasks.filter((task) => task.status === status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-200 from-gray-50 to-gray-100 border">
        <div className={`w-4 h-4 rounded-full ${config.color} shadow-lg`} />
        <h2 className="text-xl font-semibold text-gray-800">{config.label}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onTaskClick={onTaskView}
            onSubTaskClick={(subtask) => {
              // Create a virtual task from subtask for viewing
              const virtualTask: Task = {
                id: subtask.id,
                title: subtask.title,
                description: subtask.content || "",
                status: task.status,
                dueDate: task.dueDate,
                subtasks: [],
                progress: subtask.progress,
              };
              onTaskView(virtualTask);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TaskManagement() {
  const statuses: (keyof typeof statusConfig)[] = [
    "released",
    "testing",
    "doing",
    "preparing",
    "not_started",
  ];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMainType, setSelectedMainType] = useState<string>("1");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const baseUrl = backendUrl();

  const handleView = (task: Task) => {
    setSelectedTask(task);
    setEditedTask({ ...task });
    setIsModalOpen(true);
    setIsExpanded(false);
    setIsEditing(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setEditedTask(null);
    setIsExpanded(false);
    setIsEditing(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const startEditing = () => {
    setIsEditing(true);
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
          content: editedTask.description,
          progress: editedTask.progress || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      closeModal();
      await fetchTasks(selectedMainType);
      toast.success("Task updated successfully");
    } catch (err) {
      console.error("Error editing task:", err);
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${baseUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchTasks(selectedMainType);
      closeModal();
      toast.success("Task deleted successfully");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
    }
  };

  const fetchTasks = async (mainType: string) => {
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

      const response = await axios.get(`${baseUrl}/tasks/report/${mainType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTasks(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setError("Could not load tasks");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(selectedMainType);
  }, [selectedMainType]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 mb-32">
      <div className="flex justify-between items-center">
        <div className="space-y-2"></div>

        <div className="w-[200px]">
          <Select value={selectedMainType} onValueChange={setSelectedMainType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select main type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Main Type {num}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {statuses
        .filter((status) => tasks.some((task) => task.status === status))
        .map((status, index, filteredStatuses) => (
          <div key={status}>
            <TaskSection
              status={status}
              tasks={tasks}
              onTaskView={handleView}
            />
            {index < filteredStatuses.length - 1 && (
              <hr className="my-8 border-border" />
            )}
          </div>
        ))}

      {/* Task Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-gray-800 rounded-lg transform transition-all duration-300 animate-fadeIn shadow-xl ${
              isExpanded ? "w-[90%] h-[90vh]" : "w-full max-w-lg h-[70vh] mx-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-3 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedTask?.title || ""}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask!,
                            title: e.target.value,
                          })
                        }
                        className="text-lg font-bold text-gray-100 border-b border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    ) : (
                      <h2 className="text-lg font-bold text-gray-100 break-words">
                        {selectedTask.title}
                      </h2>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
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
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={startEditing}
                        className="h-8 w-8 text-gray-400 hover:text-gray-100"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(selectedTask.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-100 transition-colors duration-300"
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
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-3">
                  <div className="prose max-w-none">
                    {isEditing ? (
                      <textarea
                        value={editedTask?.description || ""}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask!,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none"
                      />
                    ) : (
                      <p className="text-gray-300 whitespace-pre-wrap break-words">
                        {selectedTask.description}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Progress (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editedTask?.progress || 0}
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask!,
                            progress: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full p-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>
                        {format(new Date(selectedTask.dueDate), "dd/MM/yyyy", {
                          locale: vi,
                        })}
                      </span>
                    </div>
                    {selectedTask.updatedAt && (
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>
                          {format(
                            new Date(selectedTask.updatedAt),
                            "dd/MM/yyyy HH:mm",
                            { locale: vi }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-700">
                {isEditing ? (
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditTask}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700"
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
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Status: {statusConfig[selectedTask.status].label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          statusConfig[selectedTask.status].color
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
