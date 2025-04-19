"use client";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
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
    <div className="ml-10 bg-white p-4 w-full shadow">
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
