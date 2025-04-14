'use client'

import { AppBar } from '@/components/dashboard/app-bar'
import { StatusBar } from '@/components/dashboard/status-bar'

export default function HomePage() {
  return (
    <div className="flex h-screen">
      {/* App Bar (Sidebar) */}
      <AppBar />
      
      {/* Main Content */}
      <div className="flex-1 bg-gray-100">
        {/* Top Status Bar */}
        <StatusBar title="Trang chủ" />
        
        {/* Dashboard Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Nhiệm vụ hôm nay</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 mr-3" />
                  <span>Hoàn thành báo cáo</span>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 mr-3" />
                  <span>Họp với nhóm thiết kế</span>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 mr-3" />
                  <span>Nộp kế hoạch dự án</span>
                </div>
              </div>
            </div>
            
            {/* Card 2 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Thống kê</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Hoàn thành</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Đang tiến hành</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chưa bắt đầu</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 3 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Ghi chú gần đây</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-md">
                  <h3 className="font-medium text-sm">Ý tưởng dự án mới</h3>
                  <p className="text-gray-500 text-xs mt-1">Cập nhật 2 giờ trước</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <h3 className="font-medium text-sm">Đánh giá cuộc họp</h3>
                  <p className="text-gray-500 text-xs mt-1">Cập nhật 1 ngày trước</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <h3 className="font-medium text-sm">Danh sách cần mua</h3>
                  <p className="text-gray-500 text-xs mt-1">Cập nhật 3 ngày trước</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 