"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/shared/theme-provider";
import { NotificationBell } from "@/components/shared/notification-bell";
import { createClient } from "@/lib/supabase/client";

export interface HeaderUser {
  id?: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export function NavUser({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Continue even if client-side signOut fails
    }

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue even if fetch fails
    }

    // Replace current history entry with landing page and popup auth open
    window.location.replace("/?auth=login");
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  const nextModeName = isDark ? "Light Mode" : "Dark Mode";

  return (
    <div className="flex items-center gap-1.5">
      <NotificationBell user={user} />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1.5 outline-none hover:bg-muted/60 transition-colors cursor-pointer">
        <Avatar className="size-8 rounded-full border border-border">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold leading-tight truncate max-w-[140px]">
            {user.name}
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[140px]">
            {user.email}
          </span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 mt-1">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground leading-none">{user.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push("/profile")}
          >
            <User className="size-4 mr-2" />
            Profile
          </DropdownMenuItem>

          {/* Menu item that switches its name, icon, and function based on active mode */}
          <DropdownMenuItem
            className="cursor-pointer flex items-center justify-between"
            onClick={toggleTheme}
          >
            <div className="flex items-center">
              {isDark ? (
                <Sun className="size-4 mr-2 text-amber-500" />
              ) : (
                <Moon className="size-4 mr-2 text-indigo-500 dark:text-indigo-400" />
              )}
              <span>{nextModeName}</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="size-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
}

