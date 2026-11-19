"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  MessageSquare,
  Heart,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ShieldAlert,
  KeyRound,
  UserPlus,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "cn";
import type { HeaderUser } from "./app-sidebar/nav-user";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  ticket_id?: string | null;
  ticket_number?: string | null;
  actor_id?: string | null;
  actor_name?: string | null;
  action_url?: string | null;
  is_read: boolean;
  group_key?: string | null;
  stack_count: number;
  created_at: string;
  updated_at: string;
}

function getRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 45) return "just now";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "TICKET_RESPONSE":
      return <MessageSquare className="size-3.5 text-blue-500" />;
    case "TICKET_REACT":
      return <Heart className="size-3.5 text-rose-500" />;
    case "TICKET_STATUS":
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case "TICKET_NEW":
      return <Sparkles className="size-3.5 text-amber-500" />;
    case "TICKET_ASSIGNED":
      return <UserCheck className="size-3.5 text-purple-500" />;
    case "REPORT_NEW":
      return <ShieldAlert className="size-3.5 text-destructive" />;
    case "PASSWORD_CHANGED":
      return <KeyRound className="size-3.5 text-amber-600 dark:text-amber-400" />;
    case "USER_REGISTERED":
      return <UserPlus className="size-3.5 text-indigo-500" />;
    default:
      return <AlertCircle className="size-3.5 text-primary" />;
  }
}

export function NotificationBell({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // background fetch catch
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;
    const supabase = createClient();

    // Listen to realtime changes on notifications table for this user
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setLoading(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
    } catch {
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  const handleClickNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: item.id }),
      }).catch(() => {});
    }

    setOpen(false);

    // Navigate to target action url (e.g. ticket chat or reports)
    if (item.action_url) {
      router.push(item.action_url);
    } else if (item.ticket_id) {
      router.push(`/tickets/${item.ticket_id}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label="View notifications"
        className={cn(
          "relative size-8 rounded-full border border-border/70 flex items-center justify-center transition-colors select-none outline-none cursor-pointer",
          "bg-background hover:bg-muted text-muted-foreground hover:text-foreground",
          open && "bg-muted text-foreground ring-2 ring-primary/20"
        )}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 dark:bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-background shadow-xs select-none animate-in zoom-in-75 duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[330px] sm:w-[380px] p-0 rounded-2xl shadow-2xl border-border bg-popover z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-semibold">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={handleMarkAllRead}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground flex items-center gap-1 font-normal"
            >
              <CheckCheck className="size-3" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 min-h-0">
          {notifications.length === 0 ? (
            <div className="py-10 text-center space-y-1.5 px-4 text-muted-foreground">
              <CheckCircle2 className="size-8 mx-auto opacity-30 text-emerald-500" />
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[11px]">No notifications right now.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.is_read;

              return (
                <div
                  key={item.id}
                  onClick={() => handleClickNotification(item)}
                  className={cn(
                    "flex items-start gap-2.5 p-3 transition-colors cursor-pointer text-left select-none",
                    isUnread
                      ? "bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/15"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="size-7 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        {item.ticket_number && (
                          <span className="font-semibold text-xs text-primary font-mono shrink-0">
                            {item.ticket_number}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.title}
                        </span>
                      </div>
                      {item.stack_count > 1 && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1 border-primary/40 text-primary font-semibold shrink-0"
                        >
                          +{item.stack_count - 1}
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground/75">
                      <span>{getRelativeTime(item.updated_at || item.created_at)}</span>
                      {isUnread && (
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
