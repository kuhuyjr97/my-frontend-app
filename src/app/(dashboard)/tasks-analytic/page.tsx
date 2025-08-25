"use client"
import { AppWindowIcon, CodeIcon, Calendar, CheckSquare, Copy, Plus, Trash2, Minimize2, Maximize2 } from "lucide-react"
import { useState, useEffect } from "react"
import axios from "axios"
import { backendUrl } from "@/app/baseUrl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Task interface
interface Task {
  id: number;
  title: string;
  content?: string;
  type?: string | number;
  subType?: number;
  status?: string;
  startedAt?: Date | string;
  dueTime?: Date | string;
  dueDate: string;
  link?: string;
  issuer?: string;
  assigner?: string;
  isMainTask?: boolean;
  progress?: number | null;
  reportGroupId?: number | null;
  reportStatus?: string;
  mainTaskId?: number | null;
}

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  })
}

// Helper function to check if task is overdue
const isOverdue = (dueDate: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to start of day
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0) // Reset time to start of day
  return due <= today // Due date is today or in the past
}

// Task Card Component - Beautiful version
interface TaskCardProps {
  task: Task
  onClick?: () => void
  taskTypes: Array<{ id: number; type: number; subType: number; content: string }>
}

function TaskCard({ task, onClick, taskTypes }: TaskCardProps) {
  const isOverdueTask = isOverdue(task.dueDate)
  
  return (
    <div
      className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 text-sm">
          {task.title}
        </h4>
        <div className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0">
          ID: {task.id}
        </div>
      </div>

      {/* Content */}
      {task.content && (
        <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 leading-relaxed text-xs">
          {task.content}
        </p>
      )}

      {/* Link as a separate row */}
      {task.link && (
        <div className="mb-3">
          <a 
            href={task.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-blue-400 hover:text-blue-300 text-xs break-all"
          >
            <svg className="h-3 w-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {task.link}
          </a>
        </div>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap gap-2">
        {task.dueDate && (
          <div
            className={`flex items-center ${
              isOverdueTask ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
            } px-2 py-1 rounded-md text-xs font-medium`}
          >
            <Calendar className="h-3 w-3 mr-1.5" />
            {formatDate(task.dueDate)}
          </div>
        )}

        {task.subType && (
          <div className="flex items-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md text-xs font-medium">
            <svg className="h-3 w-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {taskTypes.find(
              (type) =>
                type.subType === task.subType
            )?.content || `Type: ${task.subType}`}
          </div>
        )}

        {task.progress !== null && task.progress !== undefined && (
          <div className="flex items-center text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs font-medium">
            <CheckSquare className="h-3 w-3 mr-1.5" />
            {task.progress}%
          </div>
        )}

        {task.mainTaskId && (
          <div className="text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-md text-xs font-medium">
            Main Task ID: {task.mainTaskId}
          </div>
        )}

        {!task.mainTaskId && task.isMainTask && (
          <div className="text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md text-xs font-medium">
            Main Task
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksAnalytic() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<string>("Vinh's task")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [subTypes, setSubTypes] = useState<Array<{ id: number; type: number; subType: number; content: string }>>([]);

  const baseUrl = backendUrl();

  const [data, setData] = useState<Record<string, Task[]> | null>(null);
  const [taskTypes, setTaskTypes] = useState<Array<{ id: number; type: number; subType: number; content: string }>>([]);
  const [displayLimit, setDisplayLimit] = useState<string>("all");

  const fetchTasks = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      localStorage.removeItem("token");
      router.push("/login");
      return;
    }

    try {
      const limit = displayLimit === "all" ? 999 : parseInt(displayLimit);
      const check = await axios.get(`${baseUrl}/tasks/limit/${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(check.data);
    } catch (error) {
      console.error("Error:", error);
    }
    
    try {
      const subTypes = await axios.get(`${baseUrl}/types/3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubTypes(subTypes.data);
      setTaskTypes(subTypes.data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  

  const handleView = (task: Task) => {
    setSelectedTask(task);
    setEditedTask(task);
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
      if (selectedTask) {
        // Edit existing task
        await axios.patch(
          `${baseUrl}/tasks/${editedTask.id}`,
          {
            title: editedTask.title,
            content: editedTask.content,
            type: 3, // Fixed type for tasks
            subType: editedTask.subType,
            startedAt: new Date().toISOString(),
            dueTime: new Date(editedTask.dueDate).toISOString(),
            link: editedTask.link,
            status: editedTask.status,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("Task updated successfully");
      } else {
        // Create new task
        console.log("Creating task with data:", {
          title: editedTask.title,
          content: editedTask.content,
          type: 3, // Fixed type for tasks
          subType: editedTask.subType,
          startedAt: new Date().toISOString(),
          dueTime: new Date(editedTask.dueDate).toISOString(),
          status: editedTask.status,
          link: editedTask.link,
        });
        const response = await axios.post(
          `${baseUrl}/tasks`,
          {
            title: editedTask.title,
            content: editedTask.content,
            type: 3, // Fixed type for tasks
            subType: editedTask.subType,
            startedAt: new Date().toISOString(),
            dueTime: new Date(editedTask.dueDate).toISOString(),
            status: editedTask.status,
            link: editedTask.link,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("Task created successfully");
      }

      closeModal();
      fetchTasks(); // Refresh tasks list
    } catch (err) {
      console.error("Error saving task:", err);
      toast.error(selectedTask ? "Failed to update task" : "Failed to create task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${baseUrl}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      closeModal();
      toast.success("Task deleted successfully");
      fetchTasks(); // Reload tasks after deletion
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);
  
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto p-6 mb-19">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-6 bg-white dark:bg-gray-800 shadow-sm">
            {data && Object.keys(data).map((key) => (
              <TabsTrigger key={key} value={key}>
                {key}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {data && Object.keys(data).map((tabKey) => {
            const tabData = data[tabKey as keyof typeof data] as Task[]
            
            return (
                              <TabsContent key={tabKey} value={tabKey} className="mt-0">
                  <div className="mb-6 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="displayLimit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Show
                        </Label>
                        <Select
                          value={displayLimit}
                          onValueChange={async (value) => {
                            setDisplayLimit(value);
                            const token = localStorage.getItem("token");
                            if (!token) {
                              localStorage.removeItem("token");
                              router.push("/login");
                              return;
                            }
                            try {
                              const limit = value === "all" ? 999 : parseInt(value);
                              const response = await axios.get(`${baseUrl}/tasks/limit/${limit}`, {
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              setData(response.data);
                            } catch (error) {
                              console.error("Error fetching tasks:", error);
                              toast.error("Failed to fetch tasks");
                            }
                          }}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Select limit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 tasks</SelectItem>
                            <SelectItem value="20">20 tasks</SelectItem>
                            <SelectItem value="30">30 tasks</SelectItem>
                            <SelectItem value="all">All tasks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button
                    onClick={() => {
                      setSelectedTask(null);
                      setEditedTask({
                        title: "",
                        content: "",
                        subType: 0,
                        dueDate: new Date().toISOString().split("T")[0],
                        status: "1"
                      } as Task);
                      setIsModalOpen(true);
                      setIsExpanded(false);
                      setIsEditing(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </div>
                
                {/* Beautiful Kanban Board Layout - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Status 1: To Do */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          To Do
                        </h3>
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-semibold px-3 py-1 rounded-full">
                          {tabData["1"] && Array.isArray(tabData["1"]) ? tabData["1"].length : 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-3">
                        {tabData["1"] && Array.isArray(tabData["1"]) && tabData["1"].length > 0 ? (
                          tabData["1"].map((item: Task) => (
                            <TaskCard key={item.id} task={item} onClick={() => handleView(item)} taskTypes={taskTypes} />
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status 2: In Progress */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                          In Progress
                        </h3>
                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-sm font-semibold px-3 py-1 rounded-full">
                          {tabData["2"] && Array.isArray(tabData["2"]) ? tabData["2"].length : 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-3">
                        {tabData["2"] && Array.isArray(tabData["2"]) && tabData["2"].length > 0 ? (
                          tabData["2"].map((item: Task) => (
                            <TaskCard key={item.id} task={item} onClick={() => handleView(item)} taskTypes={taskTypes} />
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No tasks
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status 3: Completed */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                          Completed
                        </h3>
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-semibold px-3 py-1 rounded-full">
                          {tabData["3"] && Array.isArray(tabData["3"]) ? tabData["3"].length : 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-3">
                        {tabData["3"] && Array.isArray(tabData["3"]) && tabData["3"].length > 0 ? (
                          tabData["3"].map((item: Task) => (
                            <TaskCard key={item.id} task={item} onClick={() => handleView(item)} taskTypes={taskTypes} />
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Task Modal */}
        {isModalOpen && (
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
                            {selectedTask?.title || "New Task"}
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
                      {selectedTask && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(selectedTask.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
                  <div className="space-y-4">
                    {/* Content */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Content
                      </label>
                      {isEditing ? (
                        <textarea
                          value={editedTask?.content || ""}
                          onChange={(e) =>
                            setEditedTask({
                              ...editedTask!,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none"
                        />
                      ) : (
                        <p className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 px-3 py-2 rounded-md min-h-[80px]">
                          {selectedTask?.content || "No content"}
                        </p>
                      )}
                    </div>

                                        {/* Task Info */}
                    <div className="flex flex-wrap gap-3">

                      {/* Type */}
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Type
                        </label>
                        {isEditing ? (
                          <Select
                            // value={editedTask?.subType?.toString()}
                            value = {subTypes.find(
                              (type) =>
                                type.subType === editedTask?.subType
                            )?.subType.toString() || "Not set"}
                            onValueChange={(value) => {
                              const subType = parseInt(value);
                              setEditedTask({ ...editedTask!, subType: subType });
                            }}
                          >
                            <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
                              <SelectValue>
                                {taskTypes.find(
                                  (type) =>
                                    type.subType === editedTask?.subType
                                )?.content || "Select type"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectGroup>
                                {taskTypes.map((type) => (
                                  <SelectItem
                                    key={type.id}
                                    value={type.subType.toString()}
                                    className="text-gray-100 hover:bg-gray-700"
                                  >
                                    {type.content}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-gray-300 bg-gray-700 px-3 py-2 rounded-md">
                            {taskTypes.find(
                              (type) =>
                                type.subType === editedTask?.subType
                            )?.content || editedTask?.subType || "Not set"}
                          </p>
                        )}
                      </div>

                      {/* Due Date */}
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Due Date
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editedTask?.dueDate || ""}
                            onChange={(e) =>
                              setEditedTask({
                                ...editedTask!,
                                dueDate: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-300 bg-gray-700 px-3 py-2 rounded-md">
                            {selectedTask?.dueDate ? formatDate(selectedTask.dueDate) : "Not set"}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Status
                        </label>
                        {isEditing ? (
                          <Select
                            value={editedTask?.status?.toString()}
                            onValueChange={(value) => {
                              setEditedTask({ ...editedTask!, status: value });
                            }}
                          >
                            <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
                              <SelectValue>
                                {editedTask?.status === "1" ? "To Do" :
                                 editedTask?.status === "2" ? "In Progress" :
                                 editedTask?.status === "3" ? "Completed" : "To Do"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectGroup>
                                {[
                                  { value: "1", label: "To Do" },
                                  { value: "2", label: "In Progress" },
                                  { value: "3", label: "Completed" }
                                ].map((status) => (
                                  <SelectItem 
                                    key={status.value} 
                                    value={status.value} 
                                    className="text-gray-100 hover:bg-gray-700"
                                  >
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-gray-300 bg-gray-700 px-3 py-2 rounded-md">
                            {selectedTask?.status === "1" ? "To Do" :
                             selectedTask?.status === "2" ? "In Progress" :
                             selectedTask?.status === "3" ? "Completed" : "To Do"}
                          </p>
                        )}
                      </div>

                      {/* Link */}
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Link
                        </label>
                        {isEditing ? (
                          <input
                            type="url"
                            value={editedTask?.link || ""}
                            onChange={(e) =>
                              setEditedTask({
                                ...editedTask!,
                                link: e.target.value,
                              })
                            }
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-300 bg-gray-700 px-3 py-2 rounded-md">
                            {selectedTask?.link ? (
                              <a href={selectedTask.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                {selectedTask.link}
                              </a>
                            ) : "Not set"}
                          </p>
                        )}
                      </div>

                      {/* Main Task ID */}
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Main Task ID
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editedTask?.mainTaskId || ""}
                            onChange={(e) =>
                              setEditedTask({
                                ...editedTask!,
                                mainTaskId: parseInt(e.target.value) || undefined,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-300 bg-gray-700 px-3 py-2 rounded-md">
                            {selectedTask?.mainTaskId ? `ID: ${selectedTask.mainTaskId}` : "Not set"}
                          </p>
                        )}
                      </div>

                      {/* Is Main Task */}
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Is Main Task
                        </label>
                        {isEditing ? (
                          <select
                            value={editedTask?.isMainTask?.toString() || ""}
                            onChange={(e) =>
                              setEditedTask({
                                ...editedTask!,
                                isMainTask: e.target.value === "true",
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <>
                            {selectedTask?.isMainTask && (
                              <p className="text-gray-300 bg-gray-700 px-3 py-2 rounded-md">
                                Yes
                              </p>
                            )}
                          </>
                        )}
                      </div>
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
                                    ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
