const KEY = (u: string) => `sidebar_nav_${u}`

/** Returns the set of hrefs that are hidden for the given user. */
export function getSidebarHidden(username: string): Set<string> {
  if (typeof window === 'undefined') return defaultHidden(username)
  try {
    const v = localStorage.getItem(KEY(username))
    if (v !== null) return new Set(JSON.parse(v) as string[])
  } catch { /* ignore */ }
  return defaultHidden(username)
}

/** Persist the hidden set for the given user. */
export function setSidebarHidden(username: string, hidden: Set<string>): void {
  localStorage.setItem(KEY(username), JSON.stringify([...hidden]))
}

function defaultHidden(username: string): Set<string> {
  // sumy item hidden by default for everyone except the sumy account
  return username === 'sumy' ? new Set() : new Set(['/v2/sumy'])
}
