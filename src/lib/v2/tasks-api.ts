import { backendUrl } from '@/app/baseUrl'
import { authFetch } from '@/lib/v2/auth-session'

export type TaskRow = {
  id: number
  title: string
  content: string | null
  status: string | null
  dueTime: string | null
  progress: number | null
  link: string | null
  typeEnumId: number | null
  typeEnum: { id: number; content: string | null; subType: number } | null
  createdAt: string
  updatedAt: string
}

const base = () => `${backendUrl()}/api/v2/tasks`

async function req<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await authFetch(input, init)
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  return res.json() as Promise<T>
}

export function fetchTasks(params?: { status?: string; typeEnumId?: number }): Promise<TaskRow[]> {
  const qs = new URLSearchParams()
  if (params?.status && params.status !== 'all') qs.set('status', params.status)
  if (params?.typeEnumId) qs.set('typeEnumId', String(params.typeEnumId))
  const url = qs.size ? `${base()}?${qs}` : base()
  return req<TaskRow[]>(url, { cache: 'no-store' })
}

export function createTask(body: {
  title: string
  content?: string
  status?: string
  dueTime?: string
  typeEnumId?: number
  progress?: number
  link?: string
}): Promise<TaskRow> {
  return req<TaskRow>(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function updateTask(id: number, body: {
  title?: string
  content?: string | null
  status?: string
  dueTime?: string | null
  typeEnumId?: number | null
  progress?: number | null
  link?: string | null
}): Promise<TaskRow> {
  return req<TaskRow>(`${base()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteTask(id: number): Promise<void> {
  const res = await authFetch(`${base()}/${id}`, { method: 'DELETE' })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}
