export type TransactionCategory = 'salary' | 'food' | 'bills' | 'invest' | 'transport' | 'shopping' | 'other'
export type TaskStatus = 'backlog' | 'inprogress' | 'review' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TimeCategory = 'work' | 'focus' | 'break'

export interface Transaction {
  id: string
  name: string
  amount: number
  category: TransactionCategory
  date: string
  note?: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  tags: string[]
  notes?: string
  subtasks: Subtask[]
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface TimeBlock {
  id: string
  label: string
  category: TimeCategory
  startTime: string
  endTime: string
  date: string
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  icon: string
  color: string
  progress: number
  targetDate?: string
  milestones: Milestone[]
  createdAt: string
}
