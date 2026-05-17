'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSessionUsername } from '@/lib/v2/auth-session'
import { getSidebarHidden } from '@/lib/v2/sidebar-prefs'
import { useLang } from '@/lib/v2/i18n/context'
import {
  LayoutDashboard,
  ListChecks,
  FileText,
  Wallet,
  Droplets,
  Layers,
} from 'lucide-react'

export const ALL_NAV_ITEMS = [
  { href: '/v2',         icon: LayoutDashboard, key: 'nav.dashboard', color: 'var(--v-text)',  bg: 'var(--v-hover)',  locked: true  },
  { href: '/v2/tasks',   icon: ListChecks,      key: 'nav.tasks',     color: '#3a5fa0', bg: '#eef3fa' },
  { href: '/v2/notes',   icon: FileText,        key: 'nav.notes',     color: '#4a7c3f', bg: '#f0f5ee' },
  { href: '/v2/finance', icon: Wallet,          key: 'nav.finance',   color: '#a07030', bg: '#faf4ee' },
  { href: '/v2/extras',  icon: Layers,          key: 'nav.extras',    color: '#7a5c9a', bg: '#f3eefa' },
  { href: '/v2/sumy',    icon: Droplets,        key: 'nav.sumy',      color: '#c97a8a', bg: '#fbeaf0' },
] as const

// null separators — inserted after notes in the desktop sidebar
const SEPARATOR_AFTER = '/v2/notes'

export function V2Sidebar() {
  const pathname = usePathname()
  const { t } = useLang()
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  useEffect(() => {
    const u = getSessionUsername() ?? ''
    setHidden(getSidebarHidden(u))
  }, [])

  const isActive = (href: string) =>
    href === '/v2' ? pathname === '/v2' : pathname.startsWith(href)

  const visible = ALL_NAV_ITEMS.filter(item => !hidden.has(item.href))

  return (
    <>
      {/* ── Desktop: left sidebar ─────────────────────────────────── */}
      <div
        className="hidden sm:flex fixed top-0 left-0 h-screen flex-col items-center py-3 z-50"
        style={{ width: 68, borderRight: '1px solid var(--v-border)', backgroundColor: 'var(--v-surface)' }}
      >
        {/* Logo */}
        <Link
          href="/v2"
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-4 shrink-0"
          style={{ backgroundColor: 'var(--v-btn-bg)' }}
        >
          <span className="text-[11px] font-medium tracking-tight" style={{ color: 'var(--v-btn-text)' }}>OS</span>
        </Link>

        {/* Main nav */}
        <div className="flex flex-col items-center gap-0.5 w-full px-2 flex-1">
          {visible.map((item, i) => {
            const prev = visible[i - 1]
            const showSep = prev?.href === SEPARATOR_AFTER
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <div key={item.href} className="w-full flex flex-col items-center">
                {showSep && <div className="w-8 h-px my-1" style={{ backgroundColor: 'var(--v-border)' }} />}
                <Link
                  href={item.href}
                  title={t(item.key)}
                  className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                  style={{ backgroundColor: active ? item.bg : 'transparent' }}
                >
                  <Icon size={19} style={{ color: active ? item.color : 'var(--v-muted)' }} />
                  <span
                    className="absolute left-12 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                    style={{ backgroundColor: 'var(--v-btn-bg)', color: 'var(--v-btn-text)', zIndex: 100 }}
                  >
                    {t(item.key)}
                  </span>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Mobile: bottom nav ────────────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1"
        style={{ height: 56, borderTop: '1px solid var(--v-border)', paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: 'var(--v-surface)' }}
      >
        {visible.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-colors"
              style={{ color: active ? item.color : 'var(--v-muted)' }}
            >
              <div
                className="w-8 h-6 rounded-[8px] flex items-center justify-center"
                style={{ backgroundColor: active ? item.bg : 'transparent' }}
              >
                <Icon size={17} />
              </div>
              <span className="text-[9px] font-medium leading-none">{t(item.key)}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
