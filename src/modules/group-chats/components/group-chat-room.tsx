"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  Maximize2,
  AlertCircle,
  Users,
  Layers,
  Code2,
  Radio,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ChatEmojiPicker } from "@/modules/tickets/components/chat-emoji-picker";

interface AttachedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  attachments?: AttachedFile[];
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    role: string;
    avatar_url?: string;
    email: string;
  };
}

interface GroupChatRoomProps {
  chatType: "pm" | "dev" | "staff";
  title: string;
  subtitle: string;
  allowedRolesLabel: string;
  icon?: "pm" | "dev" | "staff";
}

function formatMessageDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  } catch {
    return "";
  }
}

function getRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 45) return "just now";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

export function GroupChatRoom({
  chatType,
  title,
  subtitle,
  allowedRolesLabel,
  icon = "staff",
}: GroupChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [userRole, setUserRole] = useState("CLIENT");
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; avatar_url?: string } | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string; role: string }[]>([]);
  const typingTimeoutsRef = useRef<{ [userId: string]: NodeJS.Timeout }>({});
  const lastTypingSentRef = useRef<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/group-chats/${chatType}`);
      const json = await res.json();

      if (!res.ok) {
        setAccessError(json.error || "Failed to load chat room");
        return;
      }

      setIsEnabled(json.isEnabled);
      setUserRole(json.userRole);
      setCurrentUser(json.currentUser);
      setMessages(json.messages || []);
      setTimeout(() => scrollToBottom("auto"), 100);
    } catch {
      setAccessError("Network error: Failed to connect to chat room");
    } finally {
      setLoading(false);
    }
  }, [chatType]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (!channelRef.current || !currentUser?.id) return;
    try {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          role: currentUser.role,
          isTyping,
        },
      });
    } catch {
      // ignore broadcast err
    }
  };

  const handleUserTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1200) {
      lastTypingSentRef.current = now;
      sendTypingStatus(true);
    }
  };

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channelName = `group-chat-${chatType}`;
    const tableName = `${chatType}_chat_messages`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.userId === currentUser?.id) return;
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
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }
      })
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        if (payload?.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message.id)) return prev;
            return [...prev, payload.message];
          });
          setTimeout(() => scrollToBottom("smooth"), 80);
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: tableName },
        async (payload) => {
          const newId = payload.new?.id;
          if (!newId) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newId)) return prev;
            // Fetch the populated record if not present
            return prev;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [chatType, currentUser?.id, loadData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const uploaded: AttachedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Max size is 15MB.`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const safeName = `group-${chatType}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = `group-chats/${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadErr) throw uploadErr;

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

      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      alert(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || sending) return;

    const outgoingText = inputText.trim();
    const outgoingAttachments = [...attachments];

    setInputText("");
    setAttachments([]);
    setSending(true);

    // Stop typing broadcast
    sendTypingStatus(false);

    try {
      const res = await fetch(`/api/group-chats/${chatType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoingText,
          attachments: outgoingAttachments,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to send message");
      }

      if (json.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.message.id)) return prev;
          return [...prev, json.message];
        });

        // Broadcast to peers
        channelRef.current?.send({
          type: "broadcast",
          event: "new_message",
          payload: { message: json.message },
        });

        setTimeout(() => scrollToBottom("smooth"), 80);
      }
    } catch (err: any) {
      alert(err.message || "Failed to send message");
      // Restore draft
      setInputText(outgoingText);
      setAttachments(outgoingAttachments);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold">
            Admin
          </Badge>
        );
      case "PM":
        return (
          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold">
            PM
          </Badge>
        );
      case "DEV":
        return (
          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold">
            Dev
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border/60">
            {role || "User"}
          </Badge>
        );
    }
  };

  const HeaderIcon = icon === "pm" ? Layers : icon === "dev" ? Code2 : Users;

  if (accessError) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full border-border/80 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <Lock className="size-6" />
            </div>
            <CardTitle className="text-lg">Access Restricted</CardTitle>
            <CardDescription className="text-xs">
              {accessError}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-2">
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-theme(spacing.4))] max-h-screen overflow-hidden p-3 md:p-5">
      {/* Top Header Card */}
      <Card className="rounded-2xl border-border/70 shadow-xs mb-3 shrink-0 bg-card/80 backdrop-blur-xs">
        <CardHeader className="p-3.5 sm:p-4 flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
              <HeaderIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold tracking-tight text-foreground truncate">
                  {title}
                </h1>
                <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground border-border/60 font-mono">
                  {allowedRolesLabel}
                </Badge>
                {isEnabled ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-semibold">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Room
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold">
                    Disabled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
              <Radio className="size-3 text-emerald-500 animate-pulse" />
              <span>Realtime Connected</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Disabled Chat Banner */}
      {!isEnabled && (
        <Alert variant="destructive" className="mb-3 py-2.5 text-xs shrink-0 rounded-xl border-destructive/40">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>
              This chat room has been disabled by the Administrator.
              {userRole === "ADMIN" ? " (Admin Override: You can still communicate and test here)." : " Messaging is currently locked."}
            </span>
            {userRole === "ADMIN" && (
              <Button size="xs" variant="outline" nativeButton={false} className="h-6 text-[11px]" render={<Link href="/admin-workplace?tab=group-chats" />}>
                Manage Group Chats
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Chat Messages Card Area */}
      <Card className="rounded-2xl border-border/70 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xs bg-card">
        <CardContent
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading team chat messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-muted-foreground py-12">
              <div className="size-12 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground mb-1">
                <HeaderIcon className="size-6 text-primary/70" />
              </div>
              <span className="text-sm font-semibold text-foreground">Welcome to {title}!</span>
              <p className="text-xs max-w-sm text-muted-foreground">
                No messages yet. Start the conversation with your team members below.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isCurrentUser = msg.user_id === currentUser?.id;
              const prevMsg = messages[idx - 1];
              const currentDateHeader = formatMessageDate(msg.created_at);
              const prevDateHeader = prevMsg ? formatMessageDate(prevMsg.created_at) : null;
              const showDateHeader = !prevMsg || currentDateHeader !== prevDateHeader;

              return (
                <div key={msg.id} className="space-y-3">
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-muted/80 text-muted-foreground border border-border/60">
                        {currentDateHeader}
                      </span>
                    </div>
                  )}

                  <div className={`flex gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                    {!isCurrentUser && (
                      <Avatar className="size-8 rounded-xl border border-border/70 shrink-0 mt-0.5 shadow-2xs">
                        {msg.sender?.avatar_url && (
                          <AvatarImage src={msg.sender.avatar_url} alt={msg.sender.full_name} />
                        )}
                        <AvatarFallback className="text-[11px] font-bold bg-muted text-foreground">
                          {msg.sender?.full_name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] space-y-1 ${isCurrentUser ? "items-end" : "items-start"}`}>
                      {!isCurrentUser && (
                        <div className="flex items-center gap-1.5 px-0.5">
                          <span className="text-xs font-semibold text-foreground">
                            {msg.sender?.full_name || "Team Member"}
                          </span>
                          {getRoleBadge(msg.sender?.role)}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {getRelativeTime(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed break-words shadow-2xs ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted/60 dark:bg-muted/40 text-foreground border border-border/60 rounded-tl-xs"
                        }`}
                      >
                        {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                        {/* Attachments inside bubble */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`space-y-1.5 ${msg.message ? "mt-2 pt-2 border-t" : ""} ${isCurrentUser ? "border-primary-foreground/20" : "border-border/60"}`}>
                            {msg.attachments.map((att, aIdx) => {
                              const isImage = att.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name);
                              if (isImage) {
                                return (
                                  <div key={aIdx} className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-xs cursor-pointer">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      onClick={() => setFullscreenImage(att.url)}
                                      className="max-h-56 w-auto object-cover rounded-xl transition-transform hover:scale-[1.02]"
                                    />
                                    <div
                                      onClick={() => setFullscreenImage(att.url)}
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] gap-1"
                                    >
                                      <Maximize2 className="size-3.5" />
                                      View Image
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <a
                                  key={aIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-xl text-xs underline-offset-2 hover:underline transition-colors ${
                                    isCurrentUser
                                      ? "bg-black/10 text-primary-foreground"
                                      : "bg-background/80 text-foreground border border-border/50"
                                  }`}
                                >
                                  <FileText className="size-3.5 shrink-0" />
                                  <span className="truncate max-w-[200px]">{att.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {isCurrentUser && (
                        <div className="flex items-center gap-1.5 px-0.5 text-[10px] text-muted-foreground font-mono">
                          <span>{getRelativeTime(msg.created_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-50 duration-200 pl-1">
              <div className="flex gap-1 items-center bg-muted/60 px-2.5 py-1 rounded-full border border-border/60">
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                <span className="ml-1 text-[11px] font-medium">
                  {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Footer Area */}
        <CardFooter className="p-3 border-t border-border/70 bg-muted/20 flex flex-col gap-2 shrink-0">
          {/* Staged Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full pt-1">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs shadow-2xs"
                >
                  <Paperclip className="size-3 text-muted-foreground" />
                  <span className="truncate max-w-[140px] text-[11px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="w-full flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploading || (!isEnabled && userRole !== "ADMIN")}
              onClick={() => fileInputRef.current?.click()}
              className="size-9 rounded-xl shrink-0"
              title="Attach screenshot or file"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="size-4 text-muted-foreground" />
              )}
            </Button>

            <ChatEmojiPicker
              disabled={!isEnabled && userRole !== "ADMIN"}
              onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
              className="size-9 rounded-xl shrink-0"
            />

            <Textarea
              rows={1}
              value={inputText}
              disabled={!isEnabled && userRole !== "ADMIN"}
              onChange={(e) => {
                setInputText(e.target.value);
                handleUserTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                !isEnabled && userRole !== "ADMIN"
                  ? "Chat is currently locked by administrator..."
                  : `Message ${title}... (Enter to send, Shift+Enter for new line)`
              }
              className="min-h-9 max-h-28 py-2 text-xs rounded-xl resize-none bg-background border-border/70 flex-1"
            />

            <Button
              type="submit"
              size="icon"
              disabled={
                sending ||
                uploading ||
                (!inputText.trim() && attachments.length === 0) ||
                (!isEnabled && userRole !== "ADMIN")
              }
              className="size-9 rounded-xl shrink-0 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
              title="Send message"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>

      {/* Fullscreen Image Preview Dialog */}
      <Dialog open={Boolean(fullscreenImage)} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-zinc-800">
          {fullscreenImage && (
            <img
              src={fullscreenImage}
              alt="Fullscreen preview"
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
