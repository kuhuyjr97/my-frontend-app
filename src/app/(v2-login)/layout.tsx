export default function V2LoginShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f6f3' }}>
      {children}
    </div>
  )
}
