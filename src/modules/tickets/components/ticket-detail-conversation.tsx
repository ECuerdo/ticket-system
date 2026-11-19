"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  ExternalLink,
  MessageSquare,
  FileText,
  Maximize2,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ChatEmojiPicker } from "./chat-emoji-picker";
import {
  MessageReactionsTrigger,
  MessageReactionsBadge,
} from "./comment-reactions";

function getRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 45) {
      return "just now";
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

interface TicketDetailProps {
  ticketId: string;
}

export function TicketDetailConversation({ ticketId }: TicketDetailProps) {
  const [ticket, setTicket] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("User");
  const [currentUserRole, setCurrentUserRole] = useState<string>("CLIENT");
  const [isStaff, setIsStaff] = useState<boolean>(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<any[]>([]);
  const [, setTimeTick] = useState(0);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string; role: string }[]>([]);
  const typingTimeoutsRef = useRef<{ [userId: string]: NodeJS.Timeout }>({});
  const lastTypingSentRef = useRef<number>(0);

  // Client Report Modal state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit report");
      }

      setReportSuccess(true);
      setTimeout(() => {
        setReportDialogOpen(false);
        setReportReason("");
        setReportSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  useEffect(() => {
    // Keep relative timestamps (e.g. "just now", "5 minutes ago") fresh
    const timer = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialScrolledRef = useRef(false);
  const channelRef = useRef<any>(null);

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? newComment.length;
      const end = textarea.selectionEnd ?? newComment.length;
      const updated = newComment.substring(0, start) + emoji + newComment.substring(end);
      setNewComment(updated);
      setTimeout(() => {
        textarea.focus();
        const nextPos = start + emoji.length;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    } else {
      setNewComment((prev) => prev + emoji);
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!channelRef.current || !currentUserId) return;
    try {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          userName: currentUserName,
          role: currentUserRole,
          isTyping,
        },
      });
    } catch {
      // ignore broadcast error
    }
  };

  const handleUserTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1200) {
      lastTypingSentRef.current = now;
      sendTypingStatus(true);
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    if (!commentId || !emoji || !currentUserId) return;

    // Optimistically update comments state
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const currentReactions: any[] = c.reactions || [];
        const existingIdx = currentReactions.findIndex(
          (r: any) => r.user_id === currentUserId && r.emoji === emoji
        );

        let nextReactions: any[];
        if (existingIdx >= 0) {
          nextReactions = currentReactions.filter((_, idx) => idx !== existingIdx);
        } else {
          nextReactions = [
            ...currentReactions,
            {
              id: `temp-${Date.now()}`,
              comment_id: commentId,
              user_id: currentUserId,
              emoji,
              created_at: new Date().toISOString(),
              user: {
                id: currentUserId,
                full_name: currentUserName,
                role: currentUserRole,
              },
            },
          ];
        }
        return { ...c, reactions: nextReactions };
      })
    );

    try {
      const res = await fetch(`/api/tickets/${ticketId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, emoji }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to toggle reaction");
      }

      // Authoritative update from server
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, reactions: json.reactions } : c
        )
      );

      // Broadcast to room
      channelRef.current?.send({
        type: "broadcast",
        event: "comment_reaction",
        payload: {
          commentId,
          reactions: json.reactions,
        },
      });
    } catch (err: any) {
      console.error("Error toggling reaction:", err);
      silentSyncComments();
    }
  };

  const isResolved = ticket?.status === "RESOLVED";
  const isRejected = ticket?.status === "REJECTED";
  const isClosedForClient = isResolved || isRejected;

  const loadTicketAndComments = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}?limit=15`);
      if (!res.ok) throw new Error("Ticket not found");
      const json = await res.json();
      setTicket(json.ticket);
      setComments(json.comments || []);
      setHasMore(Boolean(json.hasMore));
      setTotalCount(json.totalCount ?? (json.comments?.length || 0));
      setCurrentUserId(json.currentUserId);
      if (json.currentUserName) setCurrentUserName(json.currentUserName);
      if (json.currentUserRole) setCurrentUserRole(json.currentUserRole);
      if (json.isStaff !== undefined) setIsStaff(Boolean(json.isStaff));
    } catch {
      console.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreComments = async () => {
    if (loadingMore || !hasMore || comments.length === 0) return;

    const oldestComment = comments[0];
    if (!oldestComment?.created_at) return;

    setLoadingMore(true);
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

    try {
      const res = await fetch(
        `/api/tickets/${ticketId}?limit=15&before=${encodeURIComponent(oldestComment.created_at)}`
      );
      if (!res.ok) throw new Error("Failed to load older messages");
      const json = await res.json();

      const olderComments = json.comments || [];
      setHasMore(Boolean(json.hasMore));
      if (json.totalCount !== undefined) {
        setTotalCount(json.totalCount);
      }

      if (olderComments.length > 0) {
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const uniqueOlder = olderComments.filter((c: any) => !existingIds.has(c.id));
          return [...uniqueOlder, ...prev];
        });

        // Preserve scroll position so content doesn't jump
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            scrollContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
          }
        });
      }
    } catch (err) {
      console.error("Error loading older comments:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // When scroll reaches within 60px of the top, auto-load older messages
    if (container.scrollTop <= 60 && hasMore && !loadingMore) {
      loadMoreComments();
    }
  };

  const silentSyncComments = async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}?limit=15`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.comments && json.comments.length > 0) {
        setComments((prev) => {
          if (prev.length === 0) return json.comments;
          const existingIds = new Set(prev.map((c) => c.id));
          const newOnes = json.comments.filter((c: any) => !existingIds.has(c.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes];
        });
      }
      if (json.totalCount !== undefined) {
        setTotalCount(json.totalCount);
      }
      if (json.currentUserRole) setCurrentUserRole(json.currentUserRole);
      if (json.isStaff !== undefined) setIsStaff(Boolean(json.isStaff));
      if (json.ticket) {
        setTicket((prevTicket: any) => {
          if (
            prevTicket?.status === json.ticket.status &&
            prevTicket?.priority === json.ticket.priority
          ) {
            return prevTicket;
          }
          return json.ticket;
        });
      }
    } catch {
      // background sync catch
    }
  };

  useEffect(() => {
    loadTicketAndComments();

    const supabase = createClient();

    // Realtime channel supporting both Broadcast and Postgres Changes
    const channel = supabase.channel(`ticket-room-${ticketId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.userId === currentUserId) return;

        // If ticket is resolved/closed and receiver is client and sender is staff, ignore
        if (isClosedForClient && !isStaff && payload.role !== "CLIENT") return;

        const { userId, userName, role, isTyping } = payload;

        if (typingTimeoutsRef.current[userId]) {
          clearTimeout(typingTimeoutsRef.current[userId]);
          delete typingTimeoutsRef.current[userId];
        }

        if (isTyping) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === userId)) return prev;
            return [...prev, { userId, name: userName || "Someone", role: role || "USER" }];
          });

          typingTimeoutsRef.current[userId] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
            delete typingTimeoutsRef.current[userId];
          }, 3000);

          const container = scrollContainerRef.current;
          if (container) {
            const isNearBottom =
              container.scrollHeight - container.scrollTop - container.clientHeight < 140;
            if (isNearBottom) {
              requestAnimationFrame(() => {
                container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
              });
            }
          }
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }
      })
      .on("broadcast", { event: "new_comment" }, ({ payload }) => {
        if (payload?.comment) {
          // If the comment is internal staff note and current user is not staff, ignore it
          if (!isStaff && payload.comment.is_internal) return;

          setComments((prev) => {
            if (prev.some((c) => c.id === payload.comment.id)) return prev;
            return [...prev, payload.comment];
          });
          setTotalCount((c) => (c !== null ? c + 1 : 1));

          const container = scrollContainerRef.current;
          if (container) {
            const isNearBottom =
              container.scrollHeight - container.scrollTop - container.clientHeight < 140;
            if (isNearBottom) {
              requestAnimationFrame(() => {
                container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
              });
            }
          }
        }
      })
      .on("broadcast", { event: "comment_reaction" }, ({ payload }) => {
        if (payload?.commentId && Array.isArray(payload.reactions)) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === payload.commentId
                ? { ...c, reactions: payload.reactions }
                : c
            )
          );
        }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          const { data: newCommentData } = await supabase
            .from("ticket_comments")
            .select("*, author:user_id(full_name, email, role), reactions:comment_reactions(id, emoji, user_id, created_at, user:profiles(id, full_name, email, role))")
            .eq("id", payload.new.id)
            .single();

          if (newCommentData) {
            // If the comment is internal staff note and current user is not staff, ignore it
            if (!isStaff && newCommentData.is_internal) return;

            setComments((prev) => {
              if (prev.some((c) => c.id === newCommentData.id)) return prev;
              return [...prev, newCommentData];
            });
            setTotalCount((c) => (c !== null ? c + 1 : 1));

            const container = scrollContainerRef.current;
            if (container) {
              const isNearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 140;
              if (isNearBottom) {
                requestAnimationFrame(() => {
                  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
                });
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ticket_comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          setTotalCount((c) => (c !== null && c > 0 ? c - 1 : 0));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticketId}`,
        },
        () => {
          silentSyncComments();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Refresh once only if the user returns to this browser tab
    const handleFocus = () => {
      silentSyncComments();
    };
    window.addEventListener("focus", handleFocus);

    const typingTimeouts = typingTimeoutsRef.current;
    return () => {
      window.removeEventListener("focus", handleFocus);
      Object.values(typingTimeouts).forEach(clearTimeout);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Initial scroll to bottom once data is first loaded
  useEffect(() => {
    if (!loading && !initialScrolledRef.current && scrollContainerRef.current) {
      initialScrolledRef.current = true;
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, [loading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const uploaded: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const safeName = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `chat/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(filePath);

        uploaded.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          size: file.size,
          type: file.type,
        });
      }

      setChatAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to upload file");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && chatAttachments.length === 0) return;

    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          attachments: chatAttachments,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Failed to post message");
      }

      setNewComment("");
      setChatAttachments([]);
      sendTypingStatus(false);

      const json = await res.json().catch(() => null);
      if (json?.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === json.comment.id)) return prev;
          return [...prev, json.comment];
        });
        setTotalCount((c) => (c !== null ? c + 1 : 1));

        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        });

        // Broadcast to other open browser tabs / clients in real-time
        try {
          channelRef.current?.send({
            type: "broadcast",
            event: "new_comment",
            payload: { comment: json.comment },
          });
        } catch {
          // ignore broadcast errors
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Error sending message");
      }
    } finally {
      setSending(false);
    }
  };

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="destructive" className="bg-amber-600">High</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">Medium</Badge>;
      case "LOW":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Open</Badge>;
      case "CONFIRMED_BUG":
        return <Badge variant="default" className="bg-purple-600">Confirmed Bug</Badge>;
      case "IN_DEVELOPMENT":
        return <Badge variant="secondary">In Dev</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600">Resolved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin mb-2" />
        Loading ticket conversation...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Ticket could not be found.</p>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/tickets" />}>
          <ArrowLeft className="size-3.5 mr-1" /> Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 w-full">
      {/* Compact Streamlined Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs shrink-0"
            nativeButton={false}
            render={<Link href="/tickets" />}
          >
            <ArrowLeft className="size-3.5 mr-1" /> Back
          </Button>

          <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 shrink-0">
            {ticket.ticket_number}
          </span>

          <h1 className="text-base sm:text-lg font-bold tracking-tight truncate max-w-[280px] sm:max-w-md lg:max-w-xl">
            {ticket.title}
          </h1>

          <div className="flex items-center gap-1.5 shrink-0">
            {ticket.system_types?.name && (
              <Badge variant="outline" className="text-[11px] font-normal border-border/70 text-muted-foreground">
                {ticket.system_types.name}
              </Badge>
            )}
            {getPriorityBadge(ticket.priority)}
            {getStatusBadge(ticket.status)}
          </div>
        </div>

        {/* Right side quick metadata pill */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span className="text-[11px] bg-muted/40 px-2.5 py-1 rounded-md border border-border/50">
            Submitted by <strong className="text-foreground">{ticket.client?.full_name || "Client"}</strong>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:h-[calc(100vh-12.5rem)] lg:min-h-[620px] lg:max-h-[880px]">
        {/* Left Column: Ticket Details & Attachments */}
        <div className="lg:col-span-5 h-full min-h-0 flex flex-col">
          <Card className="border-border shadow-xs h-full flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/70 shrink-0">
              <CardTitle className="text-sm font-semibold">Original Issue Report</CardTitle>
              <CardDescription className="text-xs">
                Submitted by {ticket.client?.full_name || "Client"} ({ticket.client?.email})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto min-h-0">
              <div className="text-xs leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border/50 break-words">
                {ticket.description}
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Initial Attachments ({ticket.attachments.length})
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {ticket.attachments.map((file: any) => {
                      const isImage =
                        file.type?.startsWith("image/") ||
                        /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || file.url);

                      return (
                        <div
                          key={file.url}
                          className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs group/att transition-all"
                        >
                          {isImage ? (
                            <div className="space-y-1.5 p-2">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative block overflow-hidden rounded-md border border-border/60 bg-muted/30 group-hover/att:border-primary/50 transition-colors"
                              >
                                <img
                                  src={file.url}
                                  alt={file.name || "Attachment"}
                                  className="w-full h-auto max-h-56 object-contain rounded-md transition-transform duration-200 group-hover/att:scale-[1.01]"
                                />
                                <div className="absolute top-2 right-2 p-1 rounded-md bg-background/80 backdrop-blur-xs text-foreground shadow-xs opacity-0 group-hover/att:opacity-100 transition-opacity">
                                  <Maximize2 className="size-3.5" />
                                </div>
                              </a>
                              <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground">
                                <span className="truncate max-w-[220px] font-medium text-foreground">
                                  {file.name}
                                </span>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 hover:text-primary transition-colors text-[10px]"
                                >
                                  <span>View full</span>
                                  <ExternalLink className="size-2.5" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2.5 hover:bg-muted/50 text-xs transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="size-4 text-primary shrink-0" />
                                <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                              </div>
                              <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ticket.pm_notes && (
                <div className="mt-2 bg-purple-500/10 border border-purple-500/20 text-purple-950 dark:text-purple-200 p-2.5 rounded-lg text-xs break-words">
                  <span className="font-semibold">PM Instructions:</span> {ticket.pm_notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Conversation / Messaging */}
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col">
          <Card className="border-border shadow-xs h-full flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/70 shrink-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  Conversation & Support Thread
                </CardTitle>
                <CardDescription className="text-xs">
                  Direct communication between Client, PM, and Engineering
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Report button strictly for Client */}
                {!isStaff && currentUserRole === "CLIENT" && (
                  <Button
                    variant="outline"
                    size="xs"
                    type="button"
                    onClick={() => {
                      setReportSuccess(false);
                      setReportDialogOpen(true);
                    }}
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    title="Report conversation privately to Admin"
                  >
                    <Flag className="size-3 mr-1" />
                    Report
                  </Button>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {totalCount !== null ? `${totalCount} Messages` : `${comments.length} Messages`}
                </Badge>
              </div>
            </CardHeader>

            {/* Chat Messages Body */}
            <CardContent
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
            >
              {/* Top Infinite Scroll Loader & Indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-1.5">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Loading older messages...</span>
                </div>
              )}
              {hasMore && !loadingMore && (
                <div className="flex justify-center py-1">
                  <button
                    type="button"
                    onClick={loadMoreComments}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                  >
                    Load older messages
                  </button>
                </div>
              )}

              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <MessageSquare className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">No messages yet in this ticket.</p>
                  <p className="text-xs mt-1">Start the conversation by sending a question or update below.</p>
                </div>
              ) : (
                comments.map((c) => {
                  const isMe = c.user_id === currentUserId;
                  const authorRole = c.author?.role || "USER";

                  return (
                    <div
                      key={c.id}
                      className={`group relative flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-muted">
                          {c.author?.full_name?.slice(0, 2).toUpperCase() || "US"}
                        </AvatarFallback>
                      </Avatar>

                      <div className={`max-w-[80%] space-y-1 ${isMe ? "items-end text-right" : ""}`}>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {c.author?.full_name || "User"}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                            {authorRole}
                          </Badge>
                          {c.is_internal && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 flex items-center gap-1">
                              <Lock className="size-2.5" />
                              Staff Only
                            </Badge>
                          )}
                          <span>&bull;</span>
                          <span
                            className="cursor-default hover:text-foreground transition-colors inline-flex items-center gap-1"
                            title={new Date(c.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          >
                            <span>{new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span className="text-[10px] text-muted-foreground/80 font-normal">
                              ({getRelativeTime(c.created_at)})
                            </span>
                          </span>
                        </div>

                        {/* Message Bubble + Reaction Trigger Container */}
                        <div className={`relative flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap text-left ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-tr-xs"
                                : "bg-muted/60 text-foreground rounded-tl-xs border border-border/60"
                            }`}
                          >
                          {c.content && <p className="whitespace-pre-wrap">{c.content}</p>}

                          {/* Comment attachments */}
                          {c.attachments && c.attachments.length > 0 && (
                            <div
                              className={`space-y-2 ${
                                c.content
                                  ? `mt-2 border-t pt-2 ${
                                      isMe ? "border-primary-foreground/25" : "border-border/60"
                                    }`
                                  : ""
                              }`}
                            >
                              {c.attachments.map((file: any) => {
                                const isImg =
                                  file.type?.startsWith("image/") ||
                                  /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || file.url);

                                return isImg ? (
                                  <a
                                    key={file.url}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block overflow-hidden rounded-md border border-border/40 bg-background/20 max-w-[260px] hover:opacity-95 transition-opacity"
                                  >
                                    <img
                                      src={file.url}
                                      alt={file.name || "Attachment"}
                                      className="w-full h-auto max-h-48 object-cover rounded-md"
                                    />
                                    <span className="block text-[10px] p-1 truncate font-mono">
                                      {file.name}
                                    </span>
                                  </a>
                                ) : (
                                  <a
                                    key={file.url}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 text-[11px] underline underline-offset-2 ${
                                      isMe ? "text-primary-foreground" : "text-primary"
                                    }`}
                                  >
                                    <FileText className="size-3" />
                                    <span className="truncate max-w-[180px]">{file.name}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          </div>

                          {/* Hover Emoji Reaction Trigger */}
                          <div className="shrink-0">
                            <MessageReactionsTrigger
                              commentId={c.id}
                              reactions={c.reactions || []}
                              currentUserId={currentUserId}
                              isMe={isMe}
                              disabled={isClosedForClient && !isStaff}
                              onToggleReaction={handleToggleReaction}
                            />
                          </div>
                        </div>

                        {/* Reactions Badge below the message */}
                        {c.reactions && c.reactions.length > 0 && (
                          <div className={`flex pt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                            <MessageReactionsBadge
                              commentId={c.id}
                              reactions={c.reactions}
                              currentUserId={currentUserId}
                              disabled={isClosedForClient && !isStaff}
                              onToggleReaction={handleToggleReaction}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>

            {/* Chat Input Footer */}
            {isClosedForClient && !isStaff ? (
              <CardFooter className="shrink-0 border-t border-border/70 p-4 bg-muted/20">
                <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1 shadow-2xs">
                  <div className="flex items-center justify-center gap-2 font-bold text-xs text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>This issue has been resolved and closed</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md mx-auto">
                    You are not allowed to chat anymore because this ticket has been completed. If you still have other inquiries or issues, please open a new ticket or contact support.
                  </p>
                </div>
              </CardFooter>
            ) : (
              <CardFooter className="shrink-0 border-t border-border/70 p-3 bg-muted/20 flex flex-col gap-2">
                {/* Staff Notice when ticket is resolved/closed */}
                {isClosedForClient && isStaff && (
                  <div className="w-full rounded-xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-xs text-purple-950 dark:text-purple-200 flex items-start gap-2 shadow-2xs">
                    <ShieldCheck className="size-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span>Issue is resolved and closed for Client</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/40 text-purple-600 dark:text-purple-400">
                          Internal Staff Mode
                        </Badge>
                      </div>
                      <p className="text-[11px] text-purple-900/80 dark:text-purple-300/80 leading-normal">
                        The client is not allowed to chat anymore and <span className="font-bold underline">will not see</span> any new messages you send here. Staff members (Admins, PMs, Devs) can continue chatting for internal discussion and notes.
                      </p>
                    </div>
                  </div>
                )}

                {/* Realtime Typing Indicator directly above chat input */}
                {typingUsers.length > 0 && (
                  <div className="w-full flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-0 duration-150">
                    <div className="flex items-center gap-1.5 bg-background dark:bg-card px-2.5 py-0.5 rounded-full border border-border/60 text-[11px] shadow-2xs">
                      <span className="font-semibold text-foreground">
                        {typingUsers.map((u) => u.name).join(", ")}
                      </span>
                      <span>{typingUsers.length > 1 ? "are typing" : "is typing"}</span>
                      <span className="flex items-center gap-0.5 ml-1">
                        <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                      </span>
                    </div>
                  </div>
                )}

                {chatAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 w-full">
                    {chatAttachments.map((f, i) => (
                      <span
                        key={f.url}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[11px] border border-border"
                      >
                        <Paperclip className="size-3 text-primary" />
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setChatAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendComment} className="flex items-end gap-2 w-full">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || sending}
                    aria-label="Attach files"
                  >
                    <Paperclip className="size-4" />
                  </Button>

                  <ChatEmojiPicker
                    onSelectEmoji={handleEmojiSelect}
                    disabled={uploading || sending}
                  />

                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      handleUserTyping();
                    }}
                    placeholder={
                      isClosedForClient && isStaff
                        ? "Write internal staff message (Client will NOT see this)..."
                        : "Type a message or reply to the ticket..."
                    }
                    className="min-h-[40px] max-h-[120px] text-xs resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment(e);
                      }
                    }}
                  />

                  <Button
                    type="submit"
                    size="icon"
                    className="size-9 shrink-0"
                    disabled={sending || uploading || (!newComment.trim() && chatAttachments.length === 0)}
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </form>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Client Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Report Ticket Conversation
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              If something went wrong, or if a staff member provided inappropriate or wrongful responses, report it directly to the system administrators.
            </DialogDescription>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h4 className="font-semibold text-sm">Report Submitted Successfully</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Thank you for your feedback. System administrators have been privately notified and will review this ticket.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4 pt-1">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Lock className="size-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] leading-normal">
                  <strong>Strictly Confidential:</strong> This report is delivered only to System Administrators. The assigned PM and Developer will <u>never</u> be notified or see that this report was filed.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report-reason" className="text-xs font-semibold">
                  Reason for Reporting <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="report-reason"
                  rows={4}
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="State clearly why you are reporting this ticket/chat..."
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReportDialogOpen(false);
                    setReportReason("");
                  }}
                  disabled={submittingReport}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={submittingReport || !reportReason.trim()}
                  className="text-xs"
                >
                  {submittingReport ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag className="size-3.5 mr-1.5" />
                      Submit Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

