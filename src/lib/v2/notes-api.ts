import { backendUrl } from '@/app/baseUrl'
import { authFetch } from '@/lib/v2/auth-session'

export type NoteRow = {
  id: number
  title: string
  content: string
  typeEnumId: number | null
  typeEnum: { id: number; content: string | null; subType: number } | null
  createdAt: string
  updatedAt: string
}

const base = () => `${backendUrl()}/api/v2/notes`

async function req<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await authFetch(input, init)
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  return res.json() as Promise<T>
}

export function fetchNotes(params?: { typeEnumId?: number }): Promise<NoteRow[]> {
  const qs = new URLSearchParams()
  if (params?.typeEnumId) qs.set('typeEnumId', String(params.typeEnumId))
  const url = qs.size ? `${base()}?${qs}` : base()
  return req<NoteRow[]>(url, { cache: 'no-store' })
}

export function createNote(body: {
  title: string
  content: string
  typeEnumId?: number
}): Promise<NoteRow> {
  return req<NoteRow>(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function updateNote(id: number, body: {
  title?: string
  content?: string
  typeEnumId?: number | null
}): Promise<NoteRow> {
  return req<NoteRow>(`${base()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteNote(id: number): Promise<void> {
  const res = await authFetch(`${base()}/${id}`, { method: 'DELETE' })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}
