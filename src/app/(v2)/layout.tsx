import { V2Sidebar } from '@/components/v2/layout/Sidebar'
import { I18nProvider } from '@/lib/v2/i18n/context'

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--v-bg)' }}>
        <V2Sidebar />
        {/* Desktop: margin-left for sidebar. Mobile: margin-left 0, padding-bottom for bottom nav */}
        <div className="sm:ml-[68px] pb-16 sm:pb-0" style={{ paddingTop: 56 }}>
          <div className="max-w-[1280px] mx-auto">
            {children}
          </div>
        </div>
      </div>
    </I18nProvider>
  )
}
