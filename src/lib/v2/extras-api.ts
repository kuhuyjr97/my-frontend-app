import { backendUrl } from '@/app/baseUrl'
import { authFetch } from '@/lib/v2/auth-session'

export type PayLaterRecord = {
  id: number
  amount: number      // positive = charge, negative = payment
  content: string
  date: string
  isPayment: boolean
}

export type PayLaterCard = {
  id: number
  name: string
  color: string
  initialBalance: number
  currentBalance: number  // positive = still owes money
  records: PayLaterRecord[]
}

export type FuelRecord = {
  id: number
  amount: number
  content: string
  date: string
}

export async function fetchFuel(token: string): Promise<FuelRecord[]> {
  const res = await authFetch(`${backendUrl()}/api/v2/extras/fuel`, { cache: 'no-store' })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchPayLater(token: string): Promise<PayLaterCard[]> {
  const res = await authFetch(`${backendUrl()}/api/v2/extras/paylater`, { cache: 'no-store' })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function createRecord(
  token: string,
  body: { type: number; typeEnumId?: number | null; amount: number; content: string; createdAt: string },
): Promise<void> {
  const res = await authFetch(`${backendUrl()}/api/v2/extras/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}

export async function updateRecord(
  token: string,
  id: number,
  body: { typeEnumId?: number | null; amount: number; content: string; createdAt: string },
): Promise<void> {
  const res = await authFetch(`${backendUrl()}/api/v2/extras/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}

export async function deleteRecord(token: string, id: number): Promise<void> {
  const res = await authFetch(`${backendUrl()}/api/v2/extras/records/${id}`, { method: 'DELETE' })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}
