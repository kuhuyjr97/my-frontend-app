import { backendUrl } from '@/app/baseUrl'
import { authFetch } from '@/lib/v2/auth-session'

export type TypeEnumRow = {
  id: number
  type: number | null
  subType: number
  content: string | null
}

export async function fetchTypes(): Promise<TypeEnumRow[]> {
  const res = await authFetch(`${backendUrl()}/types`, { cache: 'no-store' })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createType(body: {
  type?: number
  content?: string
}): Promise<TypeEnumRow> {
  const res = await authFetch(`${backendUrl()}/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  return res.json()
}

export async function updateType(
  id: number,
  body: { content?: string; type?: number },
): Promise<TypeEnumRow> {
  const res = await authFetch(`${backendUrl()}/types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  return res.json()
}

export async function deleteType(id: number): Promise<void> {
  const res = await authFetch(`${backendUrl()}/types/${id}`, {
    method: 'DELETE',
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}
