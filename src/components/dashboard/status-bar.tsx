'use client'

interface StatusBarProps {
  title: string
}

export function StatusBar({ title }: StatusBarProps) {
  return (
    <div className="bg-white p-4 shadow">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="pl-10 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <div className="ml-4 relative">
            <button className="flex items-center focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                UT
              </div>
              <span className="ml-2">Người dùng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 