"use client";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";

import { useRouter } from "next/navigation";

interface StatusBarProps {
  title: string;
}

export function StatusBar({ title }: StatusBarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");

    router.push("/login");
  };

  return (
    <div className="bg-white p-4 w-full shadow">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center">
          <div className="relative"></div>
          <div className="ml-4 relative">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Helloasdsad !</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    {/* <button 
          className="flex items-center w-full p-4 gap-3 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md"
          onClick={handleLogout}
        > */}
                    <NavigationMenuLink onClick={handleLogout}>
                      Log out
                    </NavigationMenuLink>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
