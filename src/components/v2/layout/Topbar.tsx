'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Settings, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { getSessionUsername, clearSessionTokens } from '@/lib/v2/auth-session'

const PAGE_TITLES: Record<string, string> = {
  '/v2': 'Dashboard',
  '/v2/tasks': 'Tasks',
  '/v2/notes': 'Notes',
  '/v2/finance': 'Finance',
  '/v2/sumy': 'Sữa mẹ',
  '/v2/time': 'Time Tracking',
  '/v2/goals': 'Goals',
  '/v2/analytics': 'Analytics',
  '/v2/settings': 'Settings',
  '/v2/types': 'Quản lý loại',
}

interface TopbarProps {
  actions?: React.ReactNode
}

export function V2Topbar({ actions }: TopbarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const title    = PAGE_TITLES[pathname] ?? 'Personal OS'

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [open, setOpen]         = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setUsername(getSessionUsername() ?? '')
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = () => {
    clearSessionTokens()
    router.push('/v2/login')
  }

  const isDark = mounted && theme === 'dark'

  return (
    <div
      className="fixed top-0 left-0 right-0 sm:left-[68px] z-40"
      style={{ height: 56, borderBottom: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
    >
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-5">
        <h1 className="text-[15px] font-medium" style={{ color: 'var(--v-text)' }}>
          {title}
        </h1>

        <div className="flex items-center gap-2">
          {actions}

          {/* User avatar + dropdown */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 h-[30px] px-2 rounded-[8px] transition-colors ml-1"
              style={{ backgroundColor: open ? 'var(--v-hover)' : 'transparent' }}
              onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'var(--v-hover)' }}
              onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--v-btn-bg)' }}
              >
                <span className="text-[10px] font-semibold select-none" style={{ color: 'var(--v-btn-text)' }}>
                  {username ? username[0].toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-[12px] font-medium" style={{ color: 'var(--v-text)' }}>
                {username || '—'}
              </span>
            </button>

            {open && (
              <div
                className="absolute top-full right-0 mt-2 rounded-[12px] shadow-xl py-1 z-[200]"
                style={{ border: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)', minWidth: 172 }}
              >
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--v-border-2)' }}>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--v-text)' }}>{username || '—'}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--v-muted)' }}>Đang đăng nhập</div>
                </div>
                <Link
                  href="/v2/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors"
                  style={{ color: 'var(--v-text-2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Settings size={13} />
                  Settings
                </Link>
                {/* Dark mode toggle */}
                {mounted && (
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className="flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors w-full text-left"
                    style={{ color: 'var(--v-text-2)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors w-full text-left"
                  style={{ color: '#b05040' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--v-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={13} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
