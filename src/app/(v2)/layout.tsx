import { V2Sidebar } from '@/components/v2/layout/Sidebar'

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f6f3' }}>
      <V2Sidebar />
      <div style={{ marginLeft: 68, paddingTop: 56 }}>
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
