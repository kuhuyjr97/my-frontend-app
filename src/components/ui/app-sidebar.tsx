import {
  Home,
  Settings,
  Wallet,
  List,
  FileText,
  ChartBar,
} from "lucide-react";

import { customStyle } from "@/app/style/custom-style";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";


// Application items.
const applicationItems = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: FileText,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: FileText,
  },
  {
    title: "Tasks Analytics",
    url: "/tasks-analytic",
    icon: FileText,
  },
  {
    title: "Report",
    url: "/taskss",
    icon: List,
  },
  {
    title: "Savings",
    url: "/savings",
    icon: Wallet,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: ChartBar,
  },
  {
    title: "Time",
    url: "/times",
    icon: Settings,
  },
  {
    title: "Types",
    url: "/settings/type",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar className="sm:w-64 lg:w-25 ">
      <SidebarContent className={`${customStyle.baseBg} text-white `}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {applicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <div
                      className={cn(
                        "py-7",
                        "lg:flex lg:flex-row lg:gap-2 lg:py-10 lg:justify-center",
                        ""
                      )}
                    >
                      <a
                        href={item.url}
                        className={cn(
                          "flex",
                          "items-center ",
                          "lg:flex-col  gap-2"
                        )}
                      >
                        <item.icon className="mb-2" />
                        <span>{item.title}</span>
                      </a>
                    </div>
                  </SidebarMenuButton>
                  <hr className={`${customStyle.baseBg}`} />
                </SidebarMenuItem>

              ))}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
