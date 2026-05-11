import { backendUrl } from '@/app/baseUrl'
import { authFetch } from '@/lib/v2/auth-session'
import type { Transaction, TransactionCategory } from '@/lib/v2/types'

const CATEGORIES: TransactionCategory[] = [
  'salary',
  'food',
  'bills',
  'invest',
  'transport',
  'shopping',
  'other',
]

function normalizeCategory(c: string): TransactionCategory {
  return CATEGORIES.includes(c as TransactionCategory)
    ? (c as TransactionCategory)
    : 'other'
}

export type ApiTransactionRow = {
  id: string
  name: string
  amount: number
  category: string
  date: string
  note?: string
  createdAt: string
  sourceType?: number
  subType?: number
}

function resolveDate(row: ApiTransactionRow): string {
  const d = row.date?.trim()
  if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  if (row.createdAt && /^\d{4}-\d{2}-\d{2}/.test(row.createdAt))
    return row.createdAt.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

export function mapApiRowToTransaction(row: ApiTransactionRow): Transaction {
  return {
    id: row.id,
    name: row.name?.trim() || 'Transaction',
    amount: row.amount,
    category: normalizeCategory(row.category),
    date: resolveDate(row),
    note: row.note,
    sourceType: row.sourceType,
    subType: row.subType,
  }
}

const TYPE_INCOME = 4
const TYPE_EXPENSE = 5

type LegacySavingRow = {
  id: number
  type: number
  amount: number
  content?: string | null
  createdAt: string
  typeEnum?: { subType: number; content?: string | null } | null
}

type TypeEnumRow = { type: number; subType: number; content?: string | null }

function rowsToLabelMap(rows: TypeEnumRow[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of rows) {
    if (r.type == null || r.subType == null) continue
    const label = String(r.content ?? '').trim() || String(r.subType)
    m.set(`${r.type}-${r.subType}`, label)
  }
  return m
}

/** Một request GET `/types` cho mỗi token (dùng chung form + enrich giao dịch). */
const typeRowsInflight = new Map<string, Promise<TypeEnumRow[]>>()

async function getSharedTypeRows(token: string): Promise<TypeEnumRow[]> {
  let p = typeRowsInflight.get(token)
  if (!p) {
    p = (async () => {
      const res = await authFetch(`${backendUrl()}/types`, {
        cache: 'no-store',
      })
      if (!res.ok) return []
      const rows = (await res.json()) as TypeEnumRow[]
      return Array.isArray(rows) ? rows : []
    })()
    typeRowsInflight.set(token, p)
  }
  return p
}

async function fetchTypeLabelMap(token: string): Promise<Map<string, string>> {
  return rowsToLabelMap(await getSharedTypeRows(token))
}

/** Giống backend finance — map label → category cho heatmap / breakdown */
function inferCategoryFromLabel(label: string): TransactionCategory {
  const l = label.toLowerCase()
  const rules: [RegExp, TransactionCategory][] = [
    [/salary|lương|thu nhập|income/, 'salary'],
    [/food|ăn|đồ ăn|nhà hàng|cơm|bún|bia/, 'food'],
    [/bill|hóa đơn|điện|nước|internet|tp |spay/, 'bills'],
    [/invest|đầu tư|thuế/, 'invest'],
    [/transport|xe|grab|xăng|grah|ô tô|oto|máy/, 'transport'],
    [/shop|mua sắm|shopping/, 'shopping'],
  ]
  for (const [re, cat] of rules) {
    if (re.test(l)) return cat
  }
  return 'other'
}

function legacyToTransactions(
  incomes: LegacySavingRow[],
  expenses: LegacySavingRow[],
  typeLabels: Map<string, string>,
): Transaction[] {
  const inc = incomes.map((row) => {
    const name = row.content?.trim() || 'Income'
    const date = row.createdAt.slice(0, 10)
    const st = row.typeEnum?.subType ?? undefined
    const enumLabel =
      st != null ? typeLabels.get(`${TYPE_INCOME}-${st}`) : undefined
    const bucketKey =
      row.type === TYPE_INCOME && st != null ? `ist-${st}` : undefined
    const bucketLabel =
      bucketKey != null ? enumLabel ?? name : undefined
    return {
      id: `inc-${row.id}`,
      name,
      amount: Math.abs(row.amount ?? 0),
      category: inferCategoryFromLabel(name),
      date,
      sourceType: row.type,
      subType: st ?? undefined,
      incomeBucketKey: bucketKey,
      incomeBucketLabel: bucketLabel,
    } satisfies Transaction
  })
  const exp = expenses.map((row) => {
    const name = row.content?.trim() || 'Expense'
    const date = row.createdAt.slice(0, 10)
    const st = row.typeEnum?.subType ?? undefined
    const enumLabel =
      st != null ? typeLabels.get(`${TYPE_EXPENSE}-${st}`) : undefined
    const bucketKey =
      row.type === TYPE_EXPENSE && st != null ? `st-${st}` : undefined
    const bucketLabel =
      bucketKey != null
        ? enumLabel ?? name
        : undefined
    return {
      id: `exp-${row.id}`,
      name,
      amount: -Math.abs(row.amount ?? 0),
      category: inferCategoryFromLabel(name),
      date,
      sourceType: row.type,
      subType: st ?? undefined,
      expenseBucketKey: bucketKey,
      expenseBucketLabel: bucketLabel,
    } satisfies Transaction
  })
  return [...inc, ...exp].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date)
    return b.id.localeCompare(a.id)
  })
}

/**
 * GET `/incomes` + `/expenses` (API dashboard cũ) — dùng khi v2 trống hoặc chưa deploy.
 */
async function fetchLegacyIncomeExpense(
  token: string,
  typeLabels: Map<string, string>,
): Promise<Transaction[]> {
  const base = backendUrl()
  const [incRes, expRes] = await Promise.all([
    authFetch(`${base}/incomes`, { cache: 'no-store' }),
    authFetch(`${base}/expenses`, { cache: 'no-store' }),
  ])
  if (incRes.status === 401 || expRes.status === 401)
    throw new Error('UNAUTHORIZED')
  if (!incRes.ok || !expRes.ok) return []
  const incomes = (await incRes.json()) as LegacySavingRow[]
  const expenses = (await expRes.json()) as LegacySavingRow[]
  if (!Array.isArray(incomes) || !Array.isArray(expenses)) return []
  return legacyToTransactions(incomes, expenses, typeLabels)
}

function enrichIncomeBuckets(
  rows: Transaction[],
  typeLabels: Map<string, string>,
): Transaction[] {
  return rows.map((t) => {
    if (t.amount <= 0) return t
    if (t.sourceType === TYPE_INCOME && t.subType != null) {
      const lab = typeLabels.get(`${TYPE_INCOME}-${t.subType}`)
      return {
        ...t,
        incomeBucketKey: `ist-${t.subType}`,
        incomeBucketLabel: lab ?? t.name,
      }
    }
    return t
  })
}

function enrichExpenseBuckets(
  rows: Transaction[],
  typeLabels: Map<string, string>,
): Transaction[] {
  return rows.map((t) => {
    if (t.amount >= 0) return t
    if (t.sourceType === TYPE_EXPENSE && t.subType != null) {
      const lab = typeLabels.get(`${TYPE_EXPENSE}-${t.subType}`)
      return {
        ...t,
        expenseBucketKey: `st-${t.subType}`,
        expenseBucketLabel: lab ?? t.name,
      }
    }
    return t
  })
}

/**
 * Ưu tiên GET `/api/v2/transactions`; nếu mảng rỗng (backend cũ trên Render) thì gọi incomes/expenses.
 */
export async function fetchFinanceTransactions(
  token: string,
  opts?: { month?: string },
): Promise<Transaction[]> {
  const base = backendUrl()
  const params = new URLSearchParams()
  if (opts?.month) params.set('month', opts.month)
  const q = params.toString()
  const url = `${base}/api/v2/transactions${q ? `?${q}` : ''}`

  const typeLabels = await fetchTypeLabelMap(token)

  let v2: Transaction[] = []
  try {
    const res = await authFetch(url, {
      cache: 'no-store',
    })
    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (res.ok) {
      const data = (await res.json()) as ApiTransactionRow[]
      v2 = Array.isArray(data) ? data.map(mapApiRowToTransaction) : []
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') throw e
  }

  if (v2.length > 0) {
    const withIncome = enrichIncomeBuckets(v2, typeLabels)
    return enrichExpenseBuckets(withIncome, typeLabels)
  }

  return fetchLegacyIncomeExpense(token, typeLabels)
}

/** Row từ GET `/types` — dùng cho form subtype giống Savings */
export type FinanceTypeEnumRow = {
  type: number
  subType: number
  content?: string | null
}

export async function fetchTypeEnums(token: string): Promise<FinanceTypeEnumRow[]> {
  return getSharedTypeRows(token)
}

/** POST `/savings` — giống trang Savings (thu nhập / chi tiêu). */
export async function createSavingTransaction(
  token: string,
  body: {
    type: number
    subType: number
    amount: number
    content: string
    createdAt: string
  },
): Promise<void> {
  const res = await authFetch(`${backendUrl()}/savings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}

/** `864` | `inc-864` | `exp-874` → id số cho PATCH/DELETE `/savings/:id` (giống Savings). */
export function parseTransactionNumericId(id: string): number | null {
  if (/^\d+$/.test(id)) return parseInt(id, 10)
  const m = id.match(/^(?:inc|exp)-(\d+)$/i)
  return m ? parseInt(m[1], 10) : null
}

export async function updateSavingTransaction(
  token: string,
  numericId: number,
  body: {
    type: number
    subType: number
    amount: number
    content: string
    createdAt: string
  },
): Promise<void> {
  const res = await authFetch(`${backendUrl()}/savings/${numericId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}

export async function deleteSavingTransaction(
  token: string,
  numericId: number,
): Promise<void> {
  const res = await authFetch(`${backendUrl()}/savings/${numericId}`, {
    method: 'DELETE',
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
}
