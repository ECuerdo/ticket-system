"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  Kanban,
  Code2,
  ShieldCheck,
  Search,
  ChevronDown,
  Layers,
  Sliders,
  Users,
  UserCheck,
  Settings,
  ShieldAlert,
  Trophy,
  Flame,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useBranding } from "@/components/shared/branding-provider";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { type HeaderUser } from "@/components/shared/app-sidebar/nav-user";
import { createClient } from "@/lib/supabase/client";

const adminSubItems = [
  {
    title: "System Types",
    href: "/admin-workplace?tab=systems",
    tab: "systems",
    icon: Layers,
  },
  {
    title: "System Choices",
    href: "/admin-workplace?tab=choices",
    tab: "choices",
    icon: Sliders,
  },
  {
    title: "User Roles",
    href: "/admin-workplace?tab=roles",
    tab: "roles",
    icon: Users,
  },
  {
    title: "PM Scope",
    href: "/admin-workplace?tab=pm-scope",
    tab: "pm-scope",
    icon: UserCheck,
  },
  {
    title: "Reports",
    href: "/admin-workplace?tab=reports",
    tab: "reports",
    icon: ShieldAlert,
  },
  {
    title: "Group Chats",
    href: "/admin-workplace?tab=group-chats",
    tab: "group-chats",
    icon: MessageSquare,
  },
];

const pmSubItems = [
  {
    title: "Tickets",
    href: "/pm-workplace?tab=tickets",
    tab: "tickets",
    icon: Ticket,
  },
  {
    title: "My Developers",
    href: "/pm-workplace?tab=my-devs",
    tab: "my-devs",
    icon: Code2,
  },
];

const devSubItems = [
  {
    title: "Tickets",
    href: "/dev-workplace?tab=tickets",
    tab: "tickets",
    icon: Ticket,
  },
];

export function AppSidebar({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  const [searchQuery, setSearchQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [pmOpen, setPmOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  // Optimistic Navigation State for instant feedback on click
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  useEffect(() => {
    // Clear optimistic highlight when actual navigation completes
    setOptimisticHref(null);
  }, [pathname, searchParams]);

  const currentFullUrl = currentTab ? `${pathname}?tab=${currentTab}` : pathname;

  const handleNavClick = (href: string) => {
    setOptimisticHref(href);
    if (href.startsWith("/pm-workplace")) setPmOpen(true);
    if (href.startsWith("/dev-workplace")) setDevOpen(true);
    if (href.startsWith("/admin-workplace")) setAdminOpen(true);
  };

  const isParentActive = (basePath: string) => {
    if (optimisticHref) {
      return optimisticHref.startsWith(basePath);
    }
    return pathname.startsWith(basePath);
  };

  const isItemActive = (href: string) => {
    if (optimisticHref) {
      return optimisticHref === href;
    }
    return pathname === href;
  };

  const isSubActive = (subHref: string, subTab: string, defaultTab: string, parentPath: string) => {
    if (optimisticHref) {
      return (
        optimisticHref === subHref ||
        (optimisticHref.startsWith(parentPath) && optimisticHref.includes(`tab=${subTab}`))
      );
    }
    return (
      pathname.startsWith(parentPath) &&
      (currentTab === subTab || (!currentTab && subTab === defaultTab))
    );
  };

  const isAdminRoute = isParentActive("/admin-workplace");
  const isPmRoute = isParentActive("/pm-workplace");
  const isDevRoute = isParentActive("/dev-workplace");

  const userRole = user.role || "CLIENT";
  const branding = useBranding();
  const isAdmin = userRole === "ADMIN";
  const isPM = userRole === "PM" || isAdmin;
  const isDev = userRole === "DEV" || isAdmin;
  const isStaff = isAdmin || userRole === "PM" || userRole === "DEV";

  const navigationModules = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Create Ticket",
      href: "/create-ticket",
      icon: PlusCircle,
    },
    {
      title: "My Tickets",
      href: "/tickets",
      icon: Ticket,
    },
    ...(isStaff
      ? [
          {
            title: "Hall of Fame",
            href: "/hall-of-fame",
            icon: Trophy,
          },
          {
            title: "Hall of Shame",
            href: "/hall-of-shame",
            icon: Flame,
          },
        ]
      : []),
  ];

  const filteredItems = navigationModules.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showSettings = userRole === "ADMIN" && "settings".includes(searchQuery.toLowerCase());

  const showPm =
    isPM &&
    ("pm workplace".includes(searchQuery.toLowerCase()) ||
      pmSubItems.some((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())));

  const showDev =
    isDev &&
    ("dev workplace".includes(searchQuery.toLowerCase()) ||
      devSubItems.some((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())));

  const showAdmin =
    isAdmin &&
    ("admin workplace".includes(searchQuery.toLowerCase()) ||
      adminSubItems.some((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())));

  const [chatSettings, setChatSettings] = useState<{
    pm_chat_enabled: boolean;
    dev_chat_enabled: boolean;
    staff_chat_enabled: boolean;
  }>({
    pm_chat_enabled: true,
    dev_chat_enabled: true,
    staff_chat_enabled: true,
  });

  const [unreadCounts, setUnreadCounts] = useState<{
    pm: number;
    dev: number;
    staff: number;
  }>({
    pm: 0,
    dev: 0,
    staff: 0,
  });

  const loadUnreadCounts = useCallback(async () => {
    if (!isStaff) return;
    try {
      const res = await fetch("/api/group-chats/unread");
      if (res.ok) {
        const json = await res.json();
        if (json.unread) {
          setUnreadCounts(json.unread);
        }
      }
    } catch {
      // ignore
    }
  }, [isStaff]);

  useEffect(() => {
    async function loadChatSettings() {
      try {
        const res = await fetch("/api/group-chats/settings");
        if (res.ok) {
          const json = await res.json();
          if (json.settings) {
            setChatSettings({
              pm_chat_enabled: Boolean(json.settings.pm_chat_enabled),
              dev_chat_enabled: Boolean(json.settings.dev_chat_enabled),
              staff_chat_enabled: Boolean(json.settings.staff_chat_enabled),
            });
          }
        }
      } catch {
        // ignore error
      }
    }
    if (isStaff) {
      loadChatSettings();
    }
  }, [isStaff]);

  // Mark read when navigating directly to a chat
  useEffect(() => {
    if (!isStaff) return;

    if (pathname === "/pm-chat") {
      setUnreadCounts((prev) => ({ ...prev, pm: 0 }));
      fetch("/api/group-chats/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType: "pm" }),
      }).catch(() => {});
    } else if (pathname === "/dev-chat") {
      setUnreadCounts((prev) => ({ ...prev, dev: 0 }));
      fetch("/api/group-chats/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType: "dev" }),
      }).catch(() => {});
    } else if (pathname === "/staff-chat") {
      setUnreadCounts((prev) => ({ ...prev, staff: 0 }));
      fetch("/api/group-chats/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType: "staff" }),
      }).catch(() => {});
    }
  }, [pathname, isStaff]);

  // Realtime subscription for unread messages
  useEffect(() => {
    if (!isStaff) return;

    loadUnreadCounts();

    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-group-chats-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pm_chat_messages" },
        (payload) => {
          if (payload.new?.user_id !== user.id) {
            if (pathname === "/pm-chat") {
              fetch("/api/group-chats/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatType: "pm" }),
              }).catch(() => {});
            } else {
              setUnreadCounts((prev) => ({ ...prev, pm: prev.pm + 1 }));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dev_chat_messages" },
        (payload) => {
          if (payload.new?.user_id !== user.id) {
            if (pathname === "/dev-chat") {
              fetch("/api/group-chats/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatType: "dev" }),
              }).catch(() => {});
            } else {
              setUnreadCounts((prev) => ({ ...prev, dev: prev.dev + 1 }));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_chat_messages" },
        (payload) => {
          if (payload.new?.user_id !== user.id) {
            if (pathname === "/staff-chat") {
              fetch("/api/group-chats/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatType: "staff" }),
              }).catch(() => {});
            } else {
              setUnreadCounts((prev) => ({ ...prev, staff: prev.staff + 1 }));
            }
          }
        }
      )
      .subscribe();

    const handleReadEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ chatType: "pm" | "dev" | "staff" }>;
      if (customEvent.detail?.chatType) {
        setUnreadCounts((prev) => ({
          ...prev,
          [customEvent.detail.chatType]: 0,
        }));
      }
    };

    window.addEventListener("group-chat-read", handleReadEvent);

    const handleFocus = () => {
      loadUnreadCounts();
    };
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadUnreadCounts();
      }
    }, 25000);

    return () => {
      channel.unsubscribe();
      window.removeEventListener("group-chat-read", handleReadEvent);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [isStaff, pathname, user.id, loadUnreadCounts]);

  const teamChatItems = [
    ...(isPM && (isAdmin || chatSettings.pm_chat_enabled)
      ? [
          {
            title: "PM Chat",
            href: "/pm-chat",
            icon: Layers,
            disabled: !chatSettings.pm_chat_enabled,
            unreadCount: unreadCounts.pm,
          },
        ]
      : []),
    ...(isDev && (isAdmin || chatSettings.dev_chat_enabled)
      ? [
          {
            title: "Dev Chat",
            href: "/dev-chat",
            icon: Code2,
            disabled: !chatSettings.dev_chat_enabled,
            unreadCount: unreadCounts.dev,
          },
        ]
      : []),
    ...(isStaff && (isAdmin || chatSettings.staff_chat_enabled)
      ? [
          {
            title: "Staff Chat",
            href: "/staff-chat",
            icon: Users,
            disabled: !chatSettings.staff_chat_enabled,
            unreadCount: unreadCounts.staff,
          },
        ]
      : []),
  ];

  const filteredTeamChats = teamChatItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-border/70 p-4">
        <Link
          href="/dashboard"
          onClick={() => handleNavClick("/dashboard")}
          className="flex items-center gap-3"
        >
          <div
            className={`flex size-9 items-center justify-center overflow-hidden rounded-xl ${
              branding.logo_url
                ? ""
                : "bg-primary text-primary-foreground shadow-md shadow-primary/25"
            }`}
          >
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.project_name} className="size-full object-contain" />
            ) : (
              <Layers className="size-5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-heading text-sm font-bold tracking-tight text-sidebar-foreground truncate">
              {branding.project_name}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              {branding.sidebar_subtitle}
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
            className="h-9 pl-8 text-xs bg-muted/40 border-border/60 rounded-xl"
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
                const isActive = isItemActive(item.href);
                const isNavigating = optimisticHref === item.href && pathname !== item.href;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.href}
                          onClick={() => handleNavClick(item.href)}
                        />
                      }
                      isActive={isActive}
                      onClick={() => handleNavClick(item.href)}
                      className={
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary hover:text-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl"
                      }
                    >
                      {isNavigating ? (
                        <RefreshCw className="size-4 shrink-0 animate-spin text-primary-foreground" />
                      ) : (
                        <Icon className="size-4 shrink-0" />
                      )}
                      <span className="truncate text-sm">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* PM Workplace with Collapsible Submodules */}
              {showPm && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    onClick={() => setPmOpen((prev) => !prev)}
                    isActive={isPmRoute}
                    className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Kanban className="size-4 shrink-0" />
                      <span className="truncate text-sm font-medium">PM Workplace</span>
                    </div>
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                        pmOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </SidebarMenuButton>

                  {pmOpen && (
                    <SidebarMenuSub className="my-1 ml-4 border-l-2 border-primary/20 pl-2">
                      {pmSubItems.map((sub) => {
                        const isSubActiveItem = isSubActive(sub.href, sub.tab, "tickets", "/pm-workplace");
                        const isNavigating = optimisticHref === sub.href && currentFullUrl !== sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <SidebarMenuSubItem key={sub.tab}>
                            <SidebarMenuSubButton
                              render={
                                <Link
                                  href={sub.href}
                                  onClick={() => handleNavClick(sub.href)}
                                />
                              }
                              isActive={isSubActiveItem}
                              onClick={() => handleNavClick(sub.href)}
                              size="sm"
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                isSubActiveItem
                                  ? "bg-sidebar-accent font-semibold text-primary"
                                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                              }`}
                            >
                              {isNavigating ? (
                                <RefreshCw className="size-3.5 shrink-0 animate-spin text-primary" />
                              ) : (
                                <SubIcon className="size-3.5 shrink-0" />
                              )}
                              <span className="truncate">{sub.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Dev Workplace with Collapsible Submodules */}
              {showDev && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    onClick={() => setDevOpen((prev) => !prev)}
                    isActive={isDevRoute}
                    className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Code2 className="size-4 shrink-0" />
                      <span className="truncate text-sm font-medium">Dev Workplace</span>
                    </div>
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                        devOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </SidebarMenuButton>

                  {devOpen && (
                    <SidebarMenuSub className="my-1 ml-4 border-l-2 border-primary/20 pl-2">
                      {devSubItems.map((sub) => {
                        const isSubActiveItem = isSubActive(sub.href, sub.tab, "tickets", "/dev-workplace");
                        const isNavigating = optimisticHref === sub.href && currentFullUrl !== sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <SidebarMenuSubItem key={sub.tab}>
                            <SidebarMenuSubButton
                              render={
                                <Link
                                  href={sub.href}
                                  onClick={() => handleNavClick(sub.href)}
                                />
                              }
                              isActive={isSubActiveItem}
                              onClick={() => handleNavClick(sub.href)}
                              size="sm"
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                isSubActiveItem
                                  ? "bg-sidebar-accent font-semibold text-primary"
                                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                              }`}
                            >
                              {isNavigating ? (
                                <RefreshCw className="size-3.5 shrink-0 animate-spin text-primary" />
                              ) : (
                                <SubIcon className="size-3.5 shrink-0" />
                              )}
                              <span className="truncate">{sub.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Admin Workplace with Collapsible Submodules */}
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    onClick={() => setAdminOpen((prev) => !prev)}
                    isActive={isAdminRoute}
                    className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="size-4 shrink-0" />
                      <span className="truncate text-sm font-medium">Admin Workplace</span>
                    </div>
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                        adminOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </SidebarMenuButton>

                  {adminOpen && (
                    <SidebarMenuSub className="my-1 ml-4 border-l-2 border-primary/20 pl-2">
                      {adminSubItems.map((sub) => {
                        const isSubActiveItem = isSubActive(sub.href, sub.tab, "systems", "/admin-workplace");
                        const isNavigating = optimisticHref === sub.href && currentFullUrl !== sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <SidebarMenuSubItem key={sub.tab}>
                            <SidebarMenuSubButton
                              render={
                                <Link
                                  href={sub.href}
                                  onClick={() => handleNavClick(sub.href)}
                                />
                              }
                              isActive={isSubActiveItem}
                              onClick={() => handleNavClick(sub.href)}
                              size="sm"
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                                isSubActiveItem
                                  ? "bg-sidebar-accent font-semibold text-primary"
                                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                              }`}
                            >
                              {isNavigating ? (
                                <RefreshCw className="size-3.5 shrink-0 animate-spin text-primary" />
                              ) : (
                                <SubIcon className="size-3.5 shrink-0" />
                              )}
                              <span className="truncate">{sub.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Settings (Admin only) */}
              {showSettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        href="/settings"
                        onClick={() => handleNavClick("/settings")}
                      />
                    }
                    isActive={isItemActive("/settings")}
                    onClick={() => handleNavClick("/settings")}
                    className={
                      isItemActive("/settings")
                        ? "bg-primary text-primary-foreground font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary hover:text-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl"
                    }
                  >
                    {optimisticHref === "/settings" && pathname !== "/settings" ? (
                      <RefreshCw className="size-4 shrink-0 animate-spin text-primary-foreground" />
                    ) : (
                      <Settings className="size-4 shrink-0" />
                    )}
                    <span className="truncate text-sm">Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team Chats Group (Visible to Staff only) */}
        {isStaff && filteredTeamChats.length > 0 && (
          <SidebarGroup className="pt-2">
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase px-3">
              Team Chats
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredTeamChats.map((item) => {
                  const isActive = isItemActive(item.href);
                  const isNavigating = optimisticHref === item.href && pathname !== item.href;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={
                          <Link
                            href={item.href}
                            onClick={() => handleNavClick(item.href)}
                          />
                        }
                        isActive={isActive}
                        onClick={() => handleNavClick(item.href)}
                        className={
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary hover:text-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl"
                        }
                      >
                        {isNavigating ? (
                          <RefreshCw className="size-4 shrink-0 animate-spin text-primary-foreground" />
                        ) : (
                          <Icon className="size-4 shrink-0" />
                        )}
                        <span className="truncate text-sm flex-1">{item.title}</span>
                        {item.disabled && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-destructive/10 text-destructive border border-destructive/20">
                            Off
                          </span>
                        )}
                        {(item.unreadCount ?? 0) > 0 && !isActive && (
                          <span className="ml-auto flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-2xs">
                            {item.unreadCount > 99 ? "99+" : item.unreadCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer Info */}
      <SidebarFooter className="border-t border-border/70 p-3">
        <div className="text-[10px] text-muted-foreground text-center font-mono truncate">
          {branding.project_name} v2.0 &bull; Supabase
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
