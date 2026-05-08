'use client'
import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/v2': 'Dashboard',
  '/v2/tasks': 'Tasks',
  '/v2/notes': 'Notes',
  '/v2/finance': 'Finance',
  '/v2/time': 'Time Tracking',
  '/v2/goals': 'Goals',
  '/v2/analytics': 'Analytics',
  '/v2/settings': 'Settings',
}

interface TopbarProps {
  actions?: React.ReactNode
}

export function V2Topbar({ actions }: TopbarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'Personal OS'

  return (
    <div
      className="fixed top-0 right-0 bg-white z-40"
      style={{ left: 68, height: 56, borderBottom: '1px solid #e8e6e1' }}
    >
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-5">
        <h1 className="text-[15px] font-medium" style={{ color: '#1a1a1a' }}>
          {title}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
