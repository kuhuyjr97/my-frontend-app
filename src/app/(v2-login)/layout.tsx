export default function V2LoginShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--v-bg)' }}>
      {children}
    </div>
  )
}
