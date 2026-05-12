import { V2Sidebar } from '@/components/v2/layout/Sidebar'

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--v-bg)' }}>
      <V2Sidebar />
      {/* Desktop: margin-left for sidebar. Mobile: margin-left 0, padding-bottom for bottom nav */}
      <div className="sm:ml-[68px] pb-16 sm:pb-0" style={{ paddingTop: 56 }}>
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
