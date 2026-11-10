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
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

export interface HeaderUser {
  name: string;
  email: string;
  avatar?: string;
}

export function NavUser({ user }: { user: HeaderUser }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  return (
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
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="size-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

