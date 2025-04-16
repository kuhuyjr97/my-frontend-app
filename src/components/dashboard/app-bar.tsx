'use client'

import { useRouter } from 'next/navigation'

export function AppBar() {
  const router = useRouter()
  
  const handleLogout = () => {
    // Xử lý logout và chuyển về trang login
    router.push('/login')
  }
  
  return (
    <div className="w-64  bg-gray-800 text-white h-full flex flex-col">
      <div className="p-4">
        <h2 className="text-xl font-bold">My App</h2>
      </div>
      <nav className="mt-8 flex-1">
        <ul>
          <li className="mb-2">
            <a href="/home" className="flex items-center px-4 py-2 bg-gray-900 text-white">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Trang chủ
            </a>
          </li>
          <li className="mb-2">
            <a href="/notes" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
              Ghi chú
            </a>
          </li>
          <li className="mb-2">
            <a href="/tasks" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Nhiệm vụ
            </a>
          </li>
          <li className="mb-2">
            <a href="/calendar" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Lịch
            </a>
          </li>
        </ul>
      </nav>
      <div className="p-4">
        <button 
          onClick={handleLogout}
          className="w-full px-4 py-2 text-gray-300 hover:bg-gray-700 rounded flex items-center"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          Đăng xuất
        </button>
      </div>
    </div>
  )
} 
