import { backendUrl } from '@/app/baseUrl'

const ACCESS_KEY = 'token'
const REFRESH_KEY = 'refreshToken'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setSessionTokens(access: string, refresh?: string | null) {
  localStorage.setItem(ACCESS_KEY, access)
  if (refresh != null && refresh !== '') {
    localStorage.setItem(REFRESH_KEY, refresh)
  }
}

export function clearSessionTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** Decode JWT payload (không verify) — lấy username từ field `context`. */
export function getSessionUsername(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as { context?: string }
    return payload.context ?? null
  } catch {
    return null
  }
}

let refreshInFlight: Promise<boolean> | null = null

/** Gọi POST /auth/refresh; trả true nếu đã có access mới trong localStorage. */
export async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const rt = getRefreshToken()
    if (!rt) return false
    try {
      const res = await fetch(`${backendUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
      if (!res.ok) {
        clearSessionTokens()
        return false
      }
      const data = (await res.json()) as { accessToken?: string }
      if (!data.accessToken) {
        clearSessionTokens()
        return false
      }
      localStorage.setItem(ACCESS_KEY, data.accessToken)
      return true
    } catch {
      clearSessionTokens()
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

function isRefreshUrl(input: RequestInfo | URL): boolean {
  const s =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : input.toString()
  return s.includes('/auth/refresh')
}

/**
 * fetch kèm Bearer access; nếu 401 thì thử refresh một lần rồi gọi lại (trừ khi đang gọi /auth/refresh).
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const access = getAccessToken()
  const headers = new Headers(init?.headers)
  if (access) headers.set('Authorization', `Bearer ${access}`)

  let res = await fetch(input, { ...init, headers })

  if (res.status !== 401 || isRefreshUrl(input)) return res

  const ok = await tryRefreshAccessToken()
  if (!ok) return res

  const h2 = new Headers(init?.headers)
  const next = getAccessToken()
  if (next) h2.set('Authorization', `Bearer ${next}`)
  return fetch(input, { ...init, headers: h2 })
}
