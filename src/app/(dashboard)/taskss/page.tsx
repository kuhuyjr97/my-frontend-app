"use client"

import { customStyle } from "@/app/style/custom-style";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, User, Clock, Minimize2, Maximize2 } from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"
import { backendUrl } from "@/app/baseUrl"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface SubTask {
  id: string
  title: string
  content: string
  progress: number
  status: "completed" | "in_progress" | "not_started"
}

interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  status: "released" | "testing" | "doing" | "preparing" | "not_started"
  subtasks: SubTask[]
  updatedAt?: string
}

const statusConfig = {
  released: { label: "Released", color: "bg-green-500" },
  testing: { label: "Testing", color: "bg-blue-500" },
  doing: { label: "Doing", color: "bg-yellow-500" },
  preparing: { label: "Preparing", color: "bg-orange-500" },
  "not_started": { label: "not_started", color: "bg-gray-500" },
}

function SubTaskCard({ subtask, index, onClick }: { subtask: SubTask; index: number; onClick: () => void }) {
  const gradientColors = [
    "from-blue-500/10 to-blue-600/20 border-blue-200",
    "from-purple-500/10 to-purple-600/20 border-purple-200",
  ]

  const progressColor =
    subtask.status === "completed" ? "bg-green-500" : subtask.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"

  return (
    <Card
      className={`h-32 bg-gradient-to-br ${gradientColors[index % 2]} border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium truncate">{subtask.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{subtask.content}</p>
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
  )
}

function TaskCard({ task, onTaskClick, onSubTaskClick }: { 
  task: Task; 
  onTaskClick: (task: Task) => void;
  onSubTaskClick: (subtask: SubTask) => void;
}) {
  const statusColor = statusConfig[task.status].color

  return (
    <div className="w-full space-y-4 mb-5">
      {/* Main Task Card */}
      <Card 
        className={`border shadow-md hover:shadow-lg  transition-all duration-300 cursor-pointer `}
        onClick={() => onTaskClick(task)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold line-clamp-2">{task.title}</CardTitle>
           
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
            </div>
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
  )
}

function TaskSection({ status, tasks, onTaskView }: { 
  status: keyof typeof statusConfig; 
  tasks: Task[];
  onTaskView: (task: Task) => void;
}) {
  const config = statusConfig[status]
  const filteredTasks = tasks.filter((task) => task.status === status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border">
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
                description: subtask.content,
                status: task.status,
                dueDate: task.dueDate,
                subtasks: [],
              }
              onTaskView(virtualTask)
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function TaskManagement() {
  const statuses: (keyof typeof statusConfig)[] = ["released", "testing", "doing", "preparing", "not_started"]
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMainType, setSelectedMainType] = useState<string>("1")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const baseUrl = backendUrl()

  const handleView = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
    setIsExpanded(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
    setIsExpanded(false)
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const fetchTasks = async (mainType: string) => {
    const token = localStorage.getItem("token")
    if (!token) {
      localStorage.removeItem("token")
      router.push("/login")
      return
    }

    try {
      const check = await axios.get(`${baseUrl}/auth/check`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!check.data) {
        localStorage.removeItem("token")
        router.push("/login")
        return
      }

      const response = await axios.get(`${baseUrl}/tasks/report/${mainType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setTasks(response.data)
      setLoading(false)
    } catch (error) {
      console.error("Error:", error)
      setError("Could not load tasks")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks(selectedMainType)
  }, [selectedMainType])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8 mb-32">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">Manage and track your project tasks across different stages</p>
        </div>
        
        <div className="w-[200px]">
          <Select
            value={selectedMainType}
            onValueChange={setSelectedMainType}
          >
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
        .filter(status => tasks.some(task => task.status === status))
        .map((status, index, filteredStatuses) => (
          <div key={status}>
            <TaskSection 
              status={status} 
              tasks={tasks} 
              onTaskView={handleView}
            />
            {index < filteredStatuses.length - 1 && <hr className="my-8 border-border" />}
          </div>
        ))}

      {/* Task Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-gray-800 rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl overflow-hidden ${
              isExpanded ? "w-[90%] h-[90vh]" : "w-full max-w-lg max-h-[80vh]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full relative">
              {/* Header - Fixed */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-100 break-words">
                    {selectedTask.title}
                  </h2>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleExpand}
                    className="h-8 w-8 text-gray-400 hover:text-gray-100 shrink-0"
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-100 transition-colors duration-300 p-1 shrink-0"
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

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="prose max-w-none">
                  <p className="text-gray-300 whitespace-pre-wrap break-words">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar size={16} />
                      <span>Due date: {format(new Date(selectedTask.dueDate), "dd/MM/yyyy", { locale: vi })}</span>
                    </div>
                    {selectedTask.updatedAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock size={16} />
                        <span>
                          Updated: {format(new Date(selectedTask.updatedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <span className="text-xs text-gray-400">
                  Status: {statusConfig[selectedTask.status].label}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
