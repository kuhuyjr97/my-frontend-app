import { backendUrl } from '@/app/baseUrl'
import { authFetch } from '@/lib/v2/auth-session'

export type RecordType = 'pump' | 'feed'
export type PumpSide = 'left' | 'right' | 'both'
export type EntryKind = 'pump_dual' | 'pump_single' | 'feed'

export interface MilkRecord {
  id: string
  type: RecordType
  /** Một dòng JSON gộp trái/phải khi pump_dual */
  entryKind?: EntryKind
  amount: number
  leftMl?: number
  rightMl?: number
  side?: PumpSide
  note?: string
  date: string // YYYY-MM-DD local date (for filtering)
  recordedAt: string // UTC ISO (for time display)
  createdAt: string
}

export interface DailySummary {
  pumpTotal: number
  pumpTimes: number
  feedTotal: number
  feedTimes: number
  balance: number
}

export interface DayStats extends DailySummary {
  date: string
}

const jsonHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
})

const base = () => `${backendUrl()}/api/v2/sumy`

export async function fetchRecords(params: { date?: string; month?: string } = {}): Promise<MilkRecord[]> {
  const q = new URLSearchParams()
  if (params.date) q.set('date', params.date)
  if (params.month) q.set('month', params.month)
  const res = await authFetch(`${base()}/records?${q}`, { headers: jsonHeaders() })
  if (!res.ok) throw new Error('Failed to fetch records')
  return res.json()
}

export async function createRecord(data: {
  type: RecordType
  amount?: number
  side?: PumpSide
  leftMl?: number
  rightMl?: number
  note?: string
  recordedAt: string
  localDate: string
}): Promise<MilkRecord> {
  const res = await authFetch(`${base()}/records`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create record')
  return res.json()
}

export async function updateRecord(
  id: string,
  data: {
    amount?: number
    side?: PumpSide
    leftMl?: number
    rightMl?: number
    note?: string
    recordedAt?: string
    localDate?: string
  },
): Promise<MilkRecord> {
  const res = await authFetch(`${base()}/records/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update record')
  return res.json()
}

export async function deleteRecord(id: string): Promise<void> {
  await authFetch(`${base()}/records/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  })
}
