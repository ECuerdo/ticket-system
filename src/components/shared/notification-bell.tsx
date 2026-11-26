"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  BellRing,
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
  ArrowRightLeft,
  AtSign,
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
  ticket_status?: string | null;
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

function getCleanTitle(item: NotificationItem) {
  if (!item.title) return "Ticket";
  if (!item.ticket_number) return item.title;
  const regex = new RegExp(`^${item.ticket_number}\\s*[-–:]?\\s*`, "i");
  const cleaned = item.title.replace(regex, "").trim();
  return cleaned || item.title;
}

function getStatusBadge(status?: string | null) {
  if (!status) return null;
  const s = status.toUpperCase();
  switch (s) {
    case "OPEN":
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
          Open
        </span>
      );
    case "CONFIRMED_BUG":
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
          Confirmed
        </span>
      );
    case "IN_DEVELOPMENT":
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
          In Dev
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
          Review
        </span>
      );
    case "RESOLVED":
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
          Resolved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
          {status}
        </span>
      );
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
    case "TICKET_TRANSFERRED":
      return <ArrowRightLeft className="size-3.5 text-blue-500" />;
    case "CHAT_MENTION":
      return <AtSign className="size-3.5 text-amber-500" />;
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestDesktopPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
    } catch {
      // ignore
    }
  }, []);

  const showDesktopNotification = useCallback(
    (item: NotificationItem) => {
      if (typeof window === "undefined") return;

      // Subtle audio ping
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch {
        // audio playback error ignore
      }

      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      try {
        const notifTitle = item.ticket_number
          ? `${item.ticket_number} • ${getCleanTitle(item)}`
          : item.title || "Vertex Ticket";

        const notif = new Notification(notifTitle, {
          body: item.message || "You have a new notification.",
          tag: item.group_key || item.id,
          requireInteraction: false,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
          if (item.action_url) {
            router.push(item.action_url);
          } else if (item.ticket_id) {
            router.push(`/tickets/${item.ticket_id}`);
          }
        };
      } catch (err) {
        console.error("Desktop notification error:", err);
      }
    },
    [router]
  );

  const showDesktopNotificationRef = useRef(showDesktopNotification);
  useEffect(() => {
    showDesktopNotificationRef.current = showDesktopNotification;
  });

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

  // Update browser tab title and favicon with unread counter (e.g. "(1) Messenger")
  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Update Title: "(N) Page Title"
    const currentTitle = document.title || "Vertex Ticket";
    // Strip existing (N) prefix if present
    const cleanTitle = currentTitle.replace(/^\(\d+\+?\)\s*/, "");
    if (unreadCount > 0) {
      const displayCount = unreadCount > 99 ? "99+" : unreadCount;
      document.title = `(${displayCount}) ${cleanTitle}`;
    } else {
      document.title = cleanTitle;
    }

    // 2. Update Favicon with a red badge dot
    const faviconLink = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || null;
    const originalHref = faviconLink?.dataset.originalHref || faviconLink?.href || "/favicon.ico";

    if (faviconLink && !faviconLink.dataset.originalHref) {
      faviconLink.dataset.originalHref = originalHref;
    }

    const setFaviconHref = (href: string) => {
      const existing = document.querySelectorAll("link[rel*='icon']");
      const newLink = document.createElement("link");
      newLink.rel = "shortcut icon";
      newLink.type = "image/png";
      newLink.href = href;
      existing.forEach((el) => el.remove());
      document.head.appendChild(newLink);
    };

    if (unreadCount > 0) {
      const drawBadgeOnCanvas = (baseImg?: HTMLImageElement) => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          if (baseImg) {
            ctx.drawImage(baseImg, 0, 0, 32, 32);
          } else {
            // High-contrast clean fallback base icon
            ctx.beginPath();
            ctx.arc(16, 16, 14, 0, 2 * Math.PI);
            ctx.fillStyle = "#2563eb"; // blue-600
            ctx.fill();
          }

          // Outer white border ring for high contrast separation (Messenger style)
          ctx.beginPath();
          ctx.arc(23, 9, 6.5, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          // Inner solid red badge dot
          ctx.beginPath();
          ctx.arc(23, 9, 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = "#ef4444"; // red-500
          ctx.fill();

          setFaviconHref(canvas.toDataURL("image/png"));
        } catch {
          // ignore canvas taint errors
        }
      };

      const img = new Image();
      if (originalHref.startsWith("http://") || originalHref.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => drawBadgeOnCanvas(img);
      img.onerror = () => drawBadgeOnCanvas();
      img.src = originalHref;
    } else {
      setFaviconHref(originalHref);
    }
  }, [unreadCount, pathname]);

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
        (payload) => {
          fetchNotifications();

          if (
            (payload.eventType === "INSERT" ||
              (payload.eventType === "UPDATE" &&
                payload.new &&
                !(payload.new as NotificationItem).is_read)) &&
            payload.new
          ) {
            showDesktopNotificationRef.current(payload.new as NotificationItem);
          }
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
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && permission === "default") {
          requestDesktopPermission();
        }
      }}
    >
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

        {/* Desktop Notification Status / Test Banner */}
        {permission === "default" ? (
          <div className="bg-primary/10 border-b border-primary/20 px-3.5 py-2 flex items-center justify-between text-[11px] text-foreground">
            <div className="flex items-center gap-1.5 font-medium">
              <BellRing className="size-3.5 text-primary shrink-0" />
              <span>Enable desktop notifications</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 font-medium bg-background hover:bg-muted"
              onClick={requestDesktopPermission}
            >
              Allow
            </Button>
          </div>
        ) : permission === "granted" ? (
          <div className="bg-muted/30 border-b border-border/40 px-3.5 py-1.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Desktop notifications active
            </span>
            <button
              type="button"
              onClick={() => {
                showDesktopNotification({
                  id: "test-" + Date.now(),
                  user_id: user?.id || "",
                  type: "TICKET_RESPONSE",
                  title: "Notification Test",
                  ticket_number: "TEST-01",
                  message: "Desktop notifications are working properly!",
                  is_read: false,
                  stack_count: 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Send Test
            </button>
          </div>
        ) : (
          <div className="bg-destructive/10 border-b border-destructive/20 px-3.5 py-1.5 flex items-center justify-between text-[10.5px] text-destructive">
            <span>Notifications blocked in browser settings</span>
          </div>
        )}

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
                        {getStatusBadge(item.ticket_status)}
                        <span className="text-xs font-semibold text-foreground truncate">
                          {getCleanTitle(item)}
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
