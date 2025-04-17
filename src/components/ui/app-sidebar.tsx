"use client";

import { Calendar, Home, Inbox, LogOut, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: Inbox,
  },
  {
    title: "Plans",
    url: "/plans",
    icon: Calendar,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: Search,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: Settings,
  },
  {
    title: "Savings",
    url: "/savings",
    icon: Settings,
  },
  {
    title: "Types",
    url: "/types",
    icon: Settings,
    data: {
      type: "",
      subtype: "",
      description: ""
    }
  },
];

export function AppSidebar() {
  const router = useRouter();

  const handleLogout = () => {
    // Remove authentication token from localStorage
    localStorage.removeItem("authToken");
    
    // Clear any other auth-related data
    sessionStorage.removeItem("user");
    
    // Redirect to login page
    router.push("/login");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <button 
          className="flex items-center w-full p-4 gap-3 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
