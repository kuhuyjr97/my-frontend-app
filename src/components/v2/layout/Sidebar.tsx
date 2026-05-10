'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ListChecks,
  FileText,
  Wallet,
  Clock,
  Target,
  BarChart2,
  Settings,
  Droplets,
} from 'lucide-react'

const modules = [
  { href: '/v2', icon: LayoutDashboard, label: 'Dashboard', color: '#1a1a1a', bg: '#f0eeea' },
  { href: '/v2/tasks', icon: ListChecks, label: 'Tasks', color: '#3a5fa0', bg: '#eef3fa' },
  { href: '/v2/notes', icon: FileText, label: 'Notes', color: '#4a7c3f', bg: '#f0f5ee' },
  null,
  { href: '/v2/finance', icon: Wallet, label: 'Finance', color: '#a07030', bg: '#faf4ee' },
  { href: '/v2/sumy', icon: Droplets, label: 'Sữa mẹ', color: '#c97a8a', bg: '#fbeaf0' },
  { href: '/v2/time', icon: Clock, label: 'Time', color: '#7040a0', bg: '#f5eefa' },
  { href: '/v2/goals', icon: Target, label: 'Goals', color: '#b05040', bg: '#faeeed' },
  null,
  { href: '/v2/analytics', icon: BarChart2, label: 'Analytics', color: '#555555', bg: '#f7f6f3' },
  { href: '/v2/settings', icon: Settings, label: 'Settings', color: '#555555', bg: '#f7f6f3' },
]

export function V2Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/v2') return pathname === '/v2'
    return pathname.startsWith(href)
  }

  return (
    <div
      style={{ width: 68, borderRight: '1px solid #e8e6e1' }}
      className="fixed top-0 left-0 h-screen bg-white flex flex-col items-center py-3 z-50"
    >
      <Link href="/v2" className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center mb-4 shrink-0">
        <span className="text-white text-[11px] font-medium tracking-tight">OS</span>
      </Link>

      <div className="flex flex-col items-center gap-0.5 w-full px-2">
        {modules.map((item, i) => {
          if (item === null) {
            return <div key={`div-${i}`} className="w-8 h-px my-1" style={{ backgroundColor: '#e8e6e1' }} />
          }
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: active ? item.bg : 'transparent' }}
            >
              <Icon
                size={19}
                style={{ color: active ? item.color : '#c0bdb8' }}
              />
              <span
                className="absolute left-12 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                style={{ backgroundColor: '#1a1a1a', color: '#fff', zIndex: 100 }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
