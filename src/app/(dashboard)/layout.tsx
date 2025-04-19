import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { StatusBar } from "@/components/dashboard/status-bar";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen relative">
      {/* Status bar nằm trên */}
      <StatusBar title="Trang chủ" />

      {/* Phần thân chia ngang: Sidebar + Content */}
      <div className="flex flex-row flex-1 overflow-hidden">
        <SidebarProvider>
          <AppSidebar />
          <div className="w-full  mx-auto overflow-y-auto">
            <main>
              <div className=" flex flex-row fixed top-5 ">
                <SidebarTrigger />
              </div>
              <div className="bg-red-500 ">{children}</div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
