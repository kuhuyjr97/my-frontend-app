"use client";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { customStyle } from "@/app/style/custom-style";
import { useRouter } from "next/navigation";
import { clearSessionTokens } from "@/lib/v2/auth-session";

interface StatusBarProps {
  title: string;
}

export function StatusBar({ title }: StatusBarProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearSessionTokens();
    router.push("/v2/login");
  };

  return (
    <div className={`${customStyle.statusBarBg}  p-4 w-full shadow`}>
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center">
          <div className="relative"></div>
          <div className="mx-10 relative">
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
