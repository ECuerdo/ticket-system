"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  Kanban,
  Code2,
  ShieldCheck,
  Search,
  LifeBuoy,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { NavUser, type HeaderUser } from "@/components/shared/app-sidebar/nav-user";

const navigationModules = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: "Create Ticket",
    href: "/create-ticket",
    icon: PlusCircle,
    badge: null,
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
    badge: null,
  },
  {
    title: "PM Workplace",
    href: "/pm-workplace",
    icon: Kanban,
    badge: null,
  },
  {
    title: "Dev Workplace",
    href: "/dev-workplace",
    icon: Code2,
    badge: null,
  },
  {
    title: "Admin Workplace",
    href: "/admin-workplace",
    icon: ShieldCheck,
    badge: null,
  },
];

export function AppSidebar({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = navigationModules.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-border/70 p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LifeBuoy className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-heading text-sm font-bold tracking-tight text-sidebar-foreground truncate">
              TicketFlow
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              Issue Tracking
            </span>
          </div>
        </Link>

        {/* Quick Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Quick search modules"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/40 border-border/60"
          />
        </div>
      </SidebarHeader>

      {/* Modules List */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase px-3">
            System Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate text-sm">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Info */}
      <SidebarFooter className="border-t border-border/70 p-3">
        <div className="text-[10px] text-muted-foreground text-center font-mono">
          TicketFlow v2.0 &bull; Supabase
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
