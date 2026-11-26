"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  Search,
  Pin,
  PinOff,
  History,
  ChevronUp,
  ChevronDown,
  Trash2,
  Reply,
  Pencil,
  Upload,
  AtSign,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ChatEmojiPicker } from "@/modules/tickets/components/chat-emoji-picker";
import {
  MessageReactionsTrigger,
  MessageReactionsBadge,
  type CommentReactionItem,
} from "@/modules/tickets/components/comment-reactions";
import { cn } from "@/lib/utils";

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
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  pinner?: {
    id: string;
    full_name: string;
  };
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  deleter?: {
    id: string;
    full_name: string;
  };
  is_edited?: boolean;
  edited_at?: string;
  reply_to_id?: string | null;
  reply_to?: {
    id: string;
    message: string;
    is_deleted?: boolean;
    sender?: {
      id: string;
      full_name: string;
      role: string;
    };
  };
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    role: string;
    avatar_url?: string;
    email: string;
  };
  reactions?: CommentReactionItem[];
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

function getBubbleRadius(isMe: boolean, isSameAsPrev: boolean, isSameAsNext: boolean) {
  if (isMe) {
    if (!isSameAsPrev && !isSameAsNext) {
      return "rounded-2xl rounded-tr-xs";
    }
    if (!isSameAsPrev && isSameAsNext) {
      return "rounded-2xl rounded-tr-2xl rounded-br-xs";
    }
    if (isSameAsPrev && isSameAsNext) {
      return "rounded-2xl rounded-tr-xs rounded-br-xs";
    }
    if (isSameAsPrev && !isSameAsNext) {
      return "rounded-2xl rounded-tr-xs rounded-br-2xl";
    }
  } else {
    if (!isSameAsPrev && !isSameAsNext) {
      return "rounded-2xl rounded-tl-xs";
    }
    if (!isSameAsPrev && isSameAsNext) {
      return "rounded-2xl rounded-tl-2xl rounded-bl-xs";
    }
    if (isSameAsPrev && isSameAsNext) {
      return "rounded-2xl rounded-tl-xs rounded-bl-xs";
    }
    if (isSameAsPrev && !isSameAsNext) {
      return "rounded-2xl rounded-tl-xs rounded-bl-2xl";
    }
  }
  return isMe ? "rounded-2xl rounded-tr-xs" : "rounded-2xl rounded-tl-xs";
}

export function GroupChatRoom({
  chatType,
  title,
  subtitle,
  allowedRolesLabel,
  icon = "staff",
}: GroupChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [chatReads, setChatReads] = useState<{ user_id: string; last_read_at: string; user?: any }[]>([]);
  const [chatMembers, setChatMembers] = useState<{ id: string; full_name: string; avatar_url?: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const lastPasteTimeRef = useRef(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [userRole, setUserRole] = useState("CLIENT");
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; avatar_url?: string } | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // History loading / pagination
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Pinned messages dialog
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false);

  // Unsend message dialog
  const [unsendConfirmId, setUnsendConfirmId] = useState<string | null>(null);

  // Reply and Edit states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string; role: string }[]>([]);
  const typingTimeoutsRef = useRef<{ [userId: string]: NodeJS.Timeout }>({});
  const lastTypingSentRef = useRef<number>(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const isSendingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const currentUserRef = useRef(currentUser);
  const tempIdCounterRef = useRef(0);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  const jumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2500);
    }
  }, []);

  // Deduplicate messages by id so no duplicates can ever appear in the UI
  const displayMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  // Map of last seen message per user (Messenger style)
  const seenUsersByMessageId = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string }[]>();
    if (!currentUser || chatReads.length === 0 || displayMessages.length === 0) return map;

    // Filter reads for other users
    const otherReads = chatReads.filter((r) => r.user_id !== currentUser.id && r.last_read_at);

    otherReads.forEach((read) => {
      const readTime = new Date(read.last_read_at).getTime();

      // Find the latest message that this user read
      let lastSeenMsgId: string | null = null;
      for (let i = displayMessages.length - 1; i >= 0; i--) {
        const msg = displayMessages[i];
        const msgTime = new Date(msg.created_at).getTime();
        // Allow 1 second clock skew
        if (readTime >= msgTime - 1000) {
          lastSeenMsgId = msg.id;
          break;
        }
      }

      if (lastSeenMsgId) {
        if (!map.has(lastSeenMsgId)) {
          map.set(lastSeenMsgId, []);
        }
        map.get(lastSeenMsgId)!.push({
          id: read.user_id,
          name: read.user?.full_name || "Team Member",
          avatar: read.user?.avatar_url,
        });
      }
    });

    return map;
  }, [chatReads, displayMessages, currentUser]);

  // Filter eligible members for @mention dropdown
  const filteredMentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();

    const options: { id: string; label: string; sublabel: string; isEveryone?: boolean; avatar_url?: string }[] = [];

    // Add @everyone option
    if ("everyone".includes(q) || "all".includes(q)) {
      options.push({
        id: "everyone",
        label: "everyone",
        sublabel: "Notify everyone in this chat",
        isEveryone: true,
      });
    }

    // Add chat members (excluding current user)
    chatMembers
      .filter((m) => m.id !== currentUser?.id && (m.full_name?.toLowerCase().includes(q) || !q))
      .forEach((m) => {
        options.push({
          id: m.id,
          label: m.full_name,
          sublabel: m.role,
          avatar_url: m.avatar_url,
        });
      });

    return options;
  }, [mentionQuery, chatMembers, currentUser]);

  const insertMention = (name: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? inputText.length;
    const textBefore = inputText.slice(0, cursor);
    const textAfter = inputText.slice(cursor);

    // Find the last '@' before cursor
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex >= 0) {
      const updated = textBefore.slice(0, atIndex) + `@${name} ` + textAfter;
      setInputText(updated);
      setMentionQuery(null);
      setTimeout(() => {
        textarea.focus();
        const nextPos = atIndex + name.length + 2;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);

    // Look for an open '@' query: '@' preceded by start of string or whitespace, followed by non-spaces
    const match = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_\s]*)$/);
    if (match) {
      const query = match[1];
      // If query has more than 2 words, close mention
      if (query.split(" ").length <= 3) {
        setMentionQuery(query);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  // Filter matched messages for search
  const matchedMessageIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return displayMessages
      .filter((m) => m.message.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [displayMessages, searchQuery]);

  const handleNextSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedMessageIds.length;
    setCurrentMatchIndex(nextIdx);
    jumpToMessage(matchedMessageIds[nextIdx]);
  };

  const handlePrevSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setCurrentMatchIndex(prevIdx);
    jumpToMessage(matchedMessageIds[prevIdx]);
  };

  // Initial load
  const loadData = useCallback(async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const res = await fetch(`/api/group-chats/${chatType}?limit=40`);
      const data = await res.json();

      if (!res.ok) {
        setAccessError(data.error || "Failed to join chat room");
        return;
      }

      setIsEnabled(data.isEnabled);
      setUserRole(data.userRole);
      setCurrentUser(data.currentUser);
      setMessages(data.messages || []);
      if (data.reads) setChatReads(data.reads);
      if (data.members) setChatMembers(data.members);
      setHasMore(Boolean(data.hasMore));
      setPinnedMessages(data.pinnedMessages || []);

      // Mark this chat room as read
      fetch("/api/group-chats/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      }).catch(() => {});

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("group-chat-read", { detail: { chatType } })
        );
      }

      setTimeout(() => scrollToBottom("auto"), 100);
    } catch {
      setAccessError("Network error while connecting to chat room");
    } finally {
      setLoading(false);
    }
  }, [chatType, scrollToBottom]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load older messages (Pagination / History Loading)
  const handleLoadOlderMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const scrollContainer = scrollRef.current;
    const prevScrollHeight = scrollContainer?.scrollHeight || 0;
    const prevScrollTop = scrollContainer?.scrollTop || 0;

    try {
      const oldestMsg = messages[0];
      const res = await fetch(
        `/api/group-chats/${chatType}?before=${encodeURIComponent(oldestMsg.created_at)}&limit=30`
      );
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUnique = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
          return [...newUnique, ...prev];
        });
        setHasMore(Boolean(data.hasMore));

        // Preserve scroll position so reading isn't interrupted
        requestAnimationFrame(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight;
            scrollContainer.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load older messages", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Typing indicator broadcasts
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !currentUser) return;
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
      // Ignored
    }
  }, [currentUser]);

  const handleUserTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      sendTypingStatus(true);
    }
  };

  // Realtime Supabase Channel
  useEffect(() => {
    const supabase = createClient();
    const channelName = `group-chat-${chatType}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload || payload.userId === currentUserRef.current?.id) return;
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

            // If this message belongs to current user and an optimistic temp message exists, replace it
            const myId = currentUserRef.current?.id;
            if (myId && payload.message.user_id === myId) {
              const hasTemp = prev.some((m) => m.id.startsWith("temp-") && m.user_id === myId);
              if (hasTemp) {
                let replaced = false;
                return prev.map((m) => {
                  if (!replaced && m.id.startsWith("temp-") && m.user_id === myId) {
                    replaced = true;
                    return payload.message;
                  }
                  return m;
                });
              }
            }

            return [...prev, payload.message];
          });
          setTimeout(() => scrollToBottom("smooth"), 80);

          fetch("/api/group-chats/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatType }),
          }).catch(() => {});
        }
      })
      .on("broadcast", { event: "reaction_toggle" }, ({ payload }) => {
        if (!payload) return;
        const { messageId, emoji, userId, action, userName, userRole: role } = payload;

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== messageId) return msg;
            const existingReactions = msg.reactions || [];

            if (action === "removed") {
              return {
                ...msg,
                reactions: existingReactions.filter(
                  (r) => !(r.user_id === userId && r.emoji === emoji)
                ),
              };
            } else {
              const alreadyHas = existingReactions.some(
                (r) => r.user_id === userId && r.emoji === emoji
              );
              if (alreadyHas) return msg;
              const newReaction: CommentReactionItem = {
                id: `rt-${userId}-${emoji}`,
                emoji,
                user_id: userId,
                created_at: new Date().toISOString(),
                user: { id: userId, full_name: userName, role },
              };
              return {
                ...msg,
                reactions: [...existingReactions, newReaction],
              };
            }
          })
        );
      })
      .on("broadcast", { event: "message_pin" }, ({ payload }) => {
        if (!payload?.messageId) return;
        const { messageId, is_pinned, pinned_at, pinned_by, pinner } = payload;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, is_pinned, pinned_at, pinned_by, pinner }
              : m
          )
        );

        setPinnedMessages((prev) => {
          if (is_pinned) {
            const foundMsg = messagesRef.current.find((m) => m.id === messageId);
            if (foundMsg && !prev.some((p) => p.id === messageId)) {
              return [{ ...foundMsg, is_pinned: true, pinned_at, pinned_by, pinner }, ...prev];
            }
            return prev;
          } else {
            return prev.filter((p) => p.id !== messageId);
          }
        });
      })
      .on("broadcast", { event: "message_unsend" }, ({ payload }) => {
        if (!payload?.messageId) return;
        const { messageId, deleted_by, deleter_name } = payload;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            if (userRole === "ADMIN") {
              return {
                ...m,
                is_deleted: true,
                deleted_by,
                deleter: { id: deleted_by, full_name: deleter_name },
                is_pinned: false,
              };
            }
            return {
              ...m,
              is_deleted: true,
              message: "",
              attachments: [],
              reactions: [],
              deleted_by,
              deleter: { id: deleted_by, full_name: deleter_name },
              is_pinned: false,
            };
          })
        );

        setPinnedMessages((prev) => prev.filter((p) => p.id !== messageId));
      })
      .on("broadcast", { event: "message_edit" }, ({ payload }) => {
        if (!payload?.message) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.message.id ? { ...m, ...payload.message } : m))
        );
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: `${chatType}_chat_messages` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          if (!updated?.id) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== updated.id) return m;
              if (updated.is_deleted && userRole !== "ADMIN") {
                return {
                  ...m,
                  ...updated,
                  message: "",
                  attachments: [],
                  reactions: [],
                };
              }
              return { ...m, ...updated };
            })
          );
          if (updated.is_deleted) {
            setPinnedMessages((prev) => prev.filter((p) => p.id !== updated.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_chat_reads",
          filter: `chat_type=eq.${chatType}`,
        },
        async (payload) => {
          if (payload.new) {
            const newRead = payload.new as any;
            let userInfo = null;
            try {
              const { data: p } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, role")
                .eq("id", newRead.user_id)
                .single();
              userInfo = p;
            } catch {
              // ignore
            }
            setChatReads((prev) => {
              const existingIdx = prev.findIndex((r) => r.user_id === newRead.user_id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = {
                  ...next[existingIdx],
                  ...newRead,
                  user: userInfo || next[existingIdx].user,
                };
                return next;
              }
              return [...prev, { ...newRead, user: userInfo }];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    const handleFocus = () => {
      fetch("/api/group-chats/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      }).catch(() => {});
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [chatType, scrollToBottom, userRole]);

  // File Upload & Staging
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (!isEnabled && userRole !== "ADMIN") return;

    setUploading(true);
    const supabase = createClient();
    const uploadedList: AttachedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const safeName = `group-${chatType}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const path = `group-chats/${chatType}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(path);

        uploadedList.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type,
        });
      }

      setAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  // Clipboard Paste (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isEnabled && userRole !== "ADMIN") return;

    // Debounce to prevent multiple trigger events
    const now = Date.now();
    if (now - lastPasteTimeRef.current < 500) {
      return;
    }

    const rawFiles = e.clipboardData?.files;
    let pastedFiles: File[] = [];

    if (rawFiles && rawFiles.length > 0) {
      pastedFiles = Array.from(rawFiles);
    } else if (e.clipboardData?.items) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }
    }

    // Deduplicate any duplicate descriptors by name and size
    const uniqueFiles = pastedFiles.filter(
      (file, index, self) =>
        index === self.findIndex((f) => f.name === file.name && f.size === file.size)
    );

    if (uniqueFiles.length > 0) {
      lastPasteTimeRef.current = now;
      e.preventDefault();
      e.stopPropagation();
      uploadFiles(uniqueFiles);
    }
  };

  // Drag and Drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEnabled && userRole !== "ADMIN") return;
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEnabled && userRole !== "ADMIN") return;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (!isEnabled && userRole !== "ADMIN") return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setInputText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
  };

  // Send or edit message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    if ((!inputText.trim() && attachments.length === 0) || isSendingRef.current) return;

    // Handle Editing Mode
    if (editingMessage) {
      const targetId = editingMessage.id;
      const newText = inputText.trim();
      setEditingMessage(null);
      setInputText("");

      // Optimistic edit update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === targetId
            ? { ...m, message: newText, is_edited: true, edited_at: new Date().toISOString() }
            : m
        )
      );

      try {
        const res = await fetch(`/api/group-chats/${chatType}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit",
            messageId: targetId,
            message: newText,
          }),
        });

        const json = await res.json();
        if (res.ok && json.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === targetId ? { ...m, ...json.message } : m))
          );
          channelRef.current?.send({
            type: "broadcast",
            event: "message_edit",
            payload: { message: json.message },
          });
        }
      } catch (err) {
        console.error("Failed to edit message", err);
      }
      return;
    }

    isSendingRef.current = true;

    const messageText = inputText.trim();
    const currentAttachments = [...attachments];
    const currentReplyTo = replyingTo;

    // Immediately clear input & attachments so user can type next message
    setInputText("");
    setAttachments([]);
    setReplyingTo(null);
    sendTypingStatus(false);

    // Create optimistic temporary message
    tempIdCounterRef.current += 1;
    const tempId = `temp-${currentUser.id}-${tempIdCounterRef.current}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      user_id: currentUser.id,
      message: messageText,
      attachments: currentAttachments,
      reply_to_id: currentReplyTo?.id || null,
      reply_to: currentReplyTo
        ? {
            id: currentReplyTo.id,
            message: currentReplyTo.message,
            is_deleted: currentReplyTo.is_deleted,
            sender: currentReplyTo.sender,
          }
        : undefined,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        full_name: currentUser.name,
        role: currentUser.role,
        avatar_url: currentUser.avatar_url,
        email: "",
      },
      reactions: [],
      is_pinned: false,
      is_deleted: false,
    };

    // Render immediately in chat feed without waiting for server
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    try {
      const res = await fetch(`/api/group-chats/${chatType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          attachments: currentAttachments,
          reply_to_id: currentReplyTo?.id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to send message");
      }

      if (json.message) {
        // Smoothly replace optimistic message with persisted message
        setMessages((prev) => {
          const alreadyHasReal = prev.some((m) => m.id === json.message.id);
          if (alreadyHasReal) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? json.message : m));
        });

        channelRef.current?.send({
          type: "broadcast",
          event: "new_message",
          payload: { message: json.message },
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message";
      alert(errorMsg);
      // Revert optimistic message and restore input
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(messageText);
      setAttachments(currentAttachments);
      setReplyingTo(currentReplyTo);
    } finally {
      // Cooldown to prevent spamming
      setTimeout(() => {
        isSendingRef.current = false;
      }, 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention suggestions popup is open, handle navigation keys
    if (mentionQuery !== null && filteredMentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentionOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentionOptions.length) % filteredMentionOptions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredMentionOptions[mentionIndex] || filteredMentionOptions[0];
        if (selected) {
          insertMention(selected.label);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === "Escape") {
      if (editingMessage) handleCancelEdit();
      if (replyingTo) setReplyingTo(null);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    // Optimistic update
    const currentMsg = messages.find((m) => m.id === messageId);
    const hasReacted = currentMsg?.reactions?.some(
      (r) => r.user_id === currentUser.id && r.emoji === emoji
    );
    const action = hasReacted ? "removed" : "added";

    tempIdCounterRef.current += 1;
    const optimisticReactionId = `temp-reaction-${currentUser.id}-${tempIdCounterRef.current}`;
    const optimisticCreatedAt = new Date().toISOString();

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = msg.reactions || [];

        if (action === "removed") {
          return {
            ...msg,
            reactions: currentReactions.filter(
              (r) => !(r.user_id === currentUser.id && r.emoji === emoji)
            ),
          };
        } else {
          const optimisticReaction: CommentReactionItem = {
            id: optimisticReactionId,
            emoji,
            user_id: currentUser.id,
            created_at: optimisticCreatedAt,
            user: {
              id: currentUser.id,
              full_name: currentUser.name,
              role: currentUser.role,
            },
          };
          return {
            ...msg,
            reactions: [...currentReactions, optimisticReaction],
          };
        }
      })
    );

    // Broadcast live to peers
    channelRef.current?.send({
      type: "broadcast",
      event: "reaction_toggle",
      payload: {
        messageId,
        emoji,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action,
      },
    });

    try {
      const res = await fetch(`/api/group-chats/${chatType}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });

      if (!res.ok) {
        // Revert on failure
        loadData();
      }
    } catch {
      loadData();
    }
  };

  // Toggle pin
  const handleTogglePin = async (messageId: string, willPin: boolean) => {
    if (!currentUser) return;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              is_pinned: willPin,
              pinned_at: willPin ? new Date().toISOString() : undefined,
              pinned_by: willPin ? currentUser.id : undefined,
              pinner: willPin ? { id: currentUser.id, full_name: currentUser.name } : undefined,
            }
          : m
      )
    );

    setPinnedMessages((prev) => {
      if (willPin) {
        const found = messages.find((m) => m.id === messageId);
        if (found && !prev.some((p) => p.id === messageId)) {
          return [{ ...found, is_pinned: true, pinned_at: new Date().toISOString() }, ...prev];
        }
        return prev;
      } else {
        return prev.filter((p) => p.id !== messageId);
      }
    });

    channelRef.current?.send({
      type: "broadcast",
      event: "message_pin",
      payload: {
        messageId,
        is_pinned: willPin,
        pinned_at: willPin ? new Date().toISOString() : null,
        pinned_by: willPin ? currentUser.id : null,
        pinner: willPin ? { id: currentUser.id, full_name: currentUser.name } : null,
      },
    });

    try {
      const res = await fetch(`/api/group-chats/${chatType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, is_pinned: willPin }),
      });

      if (!res.ok) {
        loadData();
      }
    } catch {
      loadData();
    }
  };

  // Confirm and soft-delete / unsend message
  const handleConfirmUnsend = async () => {
    if (!unsendConfirmId || !currentUser) return;
    const targetId = unsendConfirmId;
    setUnsendConfirmId(null);

    // Optimistically update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== targetId) return m;
        if (userRole === "ADMIN") {
          return {
            ...m,
            is_deleted: true,
            deleted_by: currentUser.id,
            deleter: { id: currentUser.id, full_name: currentUser.name },
            is_pinned: false,
          };
        }
        return {
          ...m,
          is_deleted: true,
          message: "",
          attachments: [],
          reactions: [],
          deleted_by: currentUser.id,
          deleter: { id: currentUser.id, full_name: currentUser.name },
          is_pinned: false,
        };
      })
    );

    setPinnedMessages((prev) => prev.filter((p) => p.id !== targetId));

    // Broadcast to peers
    channelRef.current?.send({
      type: "broadcast",
      event: "message_unsend",
      payload: {
        messageId: targetId,
        deleted_by: currentUser.id,
        deleter_name: currentUser.name,
      },
    });

    try {
      const res = await fetch(`/api/group-chats/${chatType}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: targetId }),
      });

      if (!res.ok) {
        loadData();
      }
    } catch {
      loadData();
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]">Admin</Badge>;
      case "PM":
        return <Badge className="bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">PM</Badge>;
      case "DEV":
        return <Badge className="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Developer</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">User</Badge>;
    }
  };

  const HeaderIcon = icon === "pm" ? Users : icon === "dev" ? Code2 : Layers;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-foreground">Entering {title}...</p>
        <p className="text-xs text-muted-foreground mt-1">Connecting to realtime channel</p>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/30 bg-card/60 backdrop-blur-sm text-center">
          <CardHeader>
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
            {/* Search Toggle Button */}
            <Button
              type="button"
              variant={searchOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
              className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-border/70"
              title="Search messages in this chat"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
            </Button>

            {/* Pinned Messages Button */}
            {pinnedMessages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPinnedModalOpen(true)}
                className="h-8 px-2.5 text-xs gap-1.5 rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                title="View pinned messages"
              >
                <Pin className="size-3.5 fill-amber-500" />
                <span>{pinnedMessages.length} Pinned</span>
              </Button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
              <Radio className="size-3 text-emerald-500 animate-pulse" />
              <span>Realtime Connected</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search Bar Banner (when search is open) */}
      {searchOpen && (
        <div className="mb-3 p-2 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-2 shrink-0 animate-in fade-in-0 duration-150">
          <Search className="size-4 text-muted-foreground ml-1.5 shrink-0" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentMatchIndex(0);
            }}
            placeholder="Search chat messages..."
            className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 shadow-none flex-1 px-1"
          />

          {searchQuery && (
            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              <Badge variant="outline" className="text-[11px] h-6 px-2 font-mono">
                {matchedMessageIds.length > 0
                  ? `${currentMatchIndex + 1} of ${matchedMessageIds.length}`
                  : "0 found"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={matchedMessageIds.length === 0}
                onClick={handlePrevSearchMatch}
                className="size-7 rounded-lg"
                title="Previous match"
              >
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={matchedMessageIds.length === 0}
                onClick={handleNextSearchMatch}
                className="size-7 rounded-lg"
                title="Next match"
              >
                <ChevronDown className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            Close
          </Button>
        </div>
      )}

      {/* Pinned Messages Top Banner */}
      {pinnedMessages.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span className="font-semibold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">
              Pinned:
            </span>
            <p className="truncate text-xs">
              <strong>{pinnedMessages[0].sender?.full_name}:</strong>{" "}
              {pinnedMessages[0].message || "Attached file"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => jumpToMessage(pinnedMessages[0].id)}
              className="h-6 px-2 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded-md"
            >
              Jump to message
            </Button>
            {pinnedMessages.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPinnedModalOpen(true)}
                className="h-6 px-2 text-[11px] border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 rounded-md"
              >
                +{pinnedMessages.length - 1} more
              </Button>
            )}
          </div>
        </div>
      )}

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
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/admin-workplace?tab=group-chats" />}
                className="h-6 text-[10px] px-2 bg-background/50 hover:bg-background"
              >
                Manage Settings
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Chat Messages Card */}
      <Card
        className="relative flex-1 flex flex-col min-h-0 rounded-2xl border-border/70 overflow-hidden shadow-xs bg-card/95"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {/* Drag and Drop Visual Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-xs border-2 border-dashed border-primary rounded-2xl pointer-events-none transition-all animate-in fade-in-0 duration-150">
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card/90 border border-primary/30 shadow-xl text-center">
              <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-xs animate-bounce">
                <Upload className="size-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Drop files here to upload</p>
                <p className="text-xs text-muted-foreground mt-0.5">Images, PDFs, documents, screenshots</p>
              </div>
            </div>
          </div>
        )}

        <CardContent
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0"
        >
          {/* History Loading Button */}
          {hasMore && (
            <div className="flex justify-center py-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={handleLoadOlderMessages}
                className="text-xs h-7 gap-1.5 rounded-full border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground shadow-2xs"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="size-3 animate-spin text-primary" />
                    Loading earlier messages...
                  </>
                ) : (
                  <>
                    <History className="size-3 text-muted-foreground" />
                    Load earlier messages
                  </>
                )}
              </Button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                <HeaderIcon className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">No messages yet</h3>
              <p className="text-xs max-w-xs mt-1">
                Start the conversation with your team. Only authorized roles ({allowedRolesLabel}) can participate in this channel.
              </p>
            </div>
          ) : (
            displayMessages.map((msg, index) => {
              const isMe = msg.user_id === currentUser?.id;
              const prevMsg = index > 0 ? displayMessages[index - 1] : null;
              const nextMsg = index < displayMessages.length - 1 ? displayMessages[index + 1] : null;

              const isWithinClusterTime = (t1: string, t2: string) => {
                try {
                  return Math.abs(new Date(t1).getTime() - new Date(t2).getTime()) <= 2 * 60 * 1000;
                } catch {
                  return false;
                }
              };

              const showDateHeader = !prevMsg || formatMessageDate(prevMsg.created_at) !== formatMessageDate(msg.created_at);
              const nextShowDateHeader = Boolean(nextMsg && formatMessageDate(nextMsg.created_at) !== formatMessageDate(msg.created_at));

              const isSameAsPrev = Boolean(
                !showDateHeader &&
                prevMsg &&
                prevMsg.user_id === msg.user_id &&
                !prevMsg.is_deleted &&
                !msg.is_deleted &&
                isWithinClusterTime(prevMsg.created_at, msg.created_at)
              );

              const isSameAsNext = Boolean(
                !nextShowDateHeader &&
                nextMsg &&
                nextMsg.user_id === msg.user_id &&
                !nextMsg.is_deleted &&
                !msg.is_deleted &&
                isWithinClusterTime(nextMsg.created_at, msg.created_at)
              );

              const isHighlighted = highlightedMessageId === msg.id || (matchedMessageIds.length > 0 && matchedMessageIds[currentMatchIndex] === msg.id);

              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={cn(isSameAsPrev ? "mt-1" : "mt-3.5")}>
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/60 px-3 py-0.5 rounded-full shadow-2xs">
                        {formatMessageDate(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex gap-2.5 group relative items-start transition-colors rounded-xl p-0.5",
                      isMe ? "flex-row-reverse" : "flex-row",
                      isHighlighted && "bg-primary/10 ring-2 ring-primary ring-offset-2 transition-all duration-300"
                    )}
                  >
                    {/* User Avatar - only for !isMe on left */}
                    {!isMe && (
                      !isSameAsPrev ? (
                        <Avatar className="size-8 rounded-full border border-border/60 shrink-0 mt-0.5 shadow-2xs">
                          {msg.sender?.avatar_url && (
                            <AvatarImage src={msg.sender.avatar_url} alt={msg.sender.full_name} />
                          )}
                          <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-bold">
                            {msg.sender?.full_name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="size-8 shrink-0" />
                      )
                    )}

                    <div className={cn("flex flex-col max-w-[82%] sm:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                      {/* Sender Name & Role - only for !isMe on first message of cluster */}
                      {!isMe && !isSameAsPrev && (
                        <div className="flex items-center gap-1.5 mb-1 px-1 flex-row">
                          <span className="text-xs font-semibold text-foreground">
                            {msg.sender?.full_name || "Team Member"}
                          </span>
                          {getRoleBadge(msg.sender?.role)}
                          {msg.is_edited && (
                            <span className="text-[10px] text-muted-foreground/80 dark:text-muted-foreground font-normal">
                              &bull; Edited
                            </span>
                          )}
                          {msg.is_pinned && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 py-0 px-1.5 h-4">
                              <Pin className="size-2.5 fill-amber-500 text-amber-500" /> Pinned
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble + Actions */}
                      <div className={cn("relative flex items-center gap-1", isMe ? "flex-row-reverse" : "flex-row")}>
                        {msg.is_deleted ? (
                          userRole === "ADMIN" ? (
                            /* Admin view: shows deleted indicator pill + original message */
                            <div className="space-y-1.5 max-w-full">
                              <div
                                className={cn(
                                  "rounded-full px-3 py-1 text-[11px] border border-destructive/30 bg-destructive/10 text-destructive italic flex items-center gap-1.5 select-none w-fit",
                                  isMe ? "rounded-tr-xs ml-auto" : "rounded-tl-xs"
                                )}
                              >
                                <Trash2 className="size-3 text-destructive" />
                                <span>
                                  {isMe
                                    ? "You deleted this message (Visible to Admin only)"
                                    : `${msg.deleter?.full_name || msg.sender?.full_name || "User"} deleted this message (Visible to Admin only)`}
                                </span>
                              </div>

                              <div
                                className={cn(
                                  "rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed break-words opacity-85 border-dashed border-2 border-destructive/30",
                                  isMe
                                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                                    : "bg-muted/80 text-foreground border-border/60 rounded-tl-xs"
                                )}
                              >
                                {msg.message && (
                                  <p className="whitespace-pre-wrap select-text font-normal">
                                    {msg.message}
                                  </p>
                                )}

                                {/* Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {msg.attachments.map((file, fIdx) => {
                                      const isImg = file.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
                                      return isImg ? (
                                        <div
                                          key={fIdx}
                                          className="relative group/img overflow-hidden rounded-xl border border-border/50 max-w-[280px] sm:max-w-[340px] cursor-pointer"
                                          onClick={() => setFullscreenImage(file.url)}
                                        >
                                          <img
                                            src={file.url}
                                            alt={file.name}
                                            className="w-full max-h-56 object-cover rounded-xl transition-transform group-hover/img:scale-105"
                                          />
                                        </div>
                                      ) : (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 p-2 rounded-lg border text-xs bg-background/80"
                                        >
                                          <FileText className="size-4 shrink-0" />
                                          <span className="truncate max-w-[180px] font-medium">{file.name}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Regular user view: Matches exact user screenshot pill */
                            <div
                              className={cn(
                                "rounded-full px-4 py-1.5 text-xs border border-border/70 bg-muted/40 text-muted-foreground italic flex items-center gap-1.5 select-none shadow-2xs",
                                isMe ? "rounded-tr-xs" : "rounded-tl-xs"
                              )}
                            >
                              <span>
                                {isMe
                                  ? "You deleted a message"
                                  : `${msg.deleter?.full_name || msg.sender?.full_name || "Someone"} deleted a message`}
                              </span>
                            </div>
                          )
                        ) : (
                          /* Normal active message bubble */
                          <div
                            className={cn(
                              "px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed break-words",
                              isMe
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/80 text-foreground border border-border/60",
                              getBubbleRadius(isMe, isSameAsPrev, isSameAsNext),
                              msg.is_pinned && "border-2 border-amber-500/40"
                            )}
                          >
                            {/* Replied Message Reference Quote */}
                            {msg.reply_to && (
                              <div
                                onClick={() => msg.reply_to_id && jumpToMessage(msg.reply_to_id)}
                                className={cn(
                                  "mb-2 px-2.5 py-1.5 rounded-lg text-[11px] border-l-2 cursor-pointer transition-opacity hover:opacity-80 flex flex-col gap-0.5 select-none",
                                  isMe
                                    ? "bg-primary-foreground/15 border-primary-foreground/70 text-primary-foreground/90"
                                    : "bg-muted border-primary text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center gap-1 font-semibold text-[10px]">
                                  <Reply className="size-2.5 shrink-0" />
                                  <span>{msg.reply_to.sender?.full_name || "Team Member"}</span>
                                </div>
                                <p className="truncate line-clamp-1 italic text-[11px]">
                                  {msg.reply_to.is_deleted ? "Deleted message" : msg.reply_to.message || "Attachment"}
                                </p>
                              </div>
                            )}

                            {msg.message && (
                              <p className="whitespace-pre-wrap select-text font-normal">
                                {(() => {
                                  // Highlight @everyone and @mentions
                                  const parts = msg.message.split(/(@(?:everyone|all|[A-Za-z0-9_]+(?:\s[A-Za-z0-9_]+)?)\b)/gi);
                                  return parts.map((part, pIdx) => {
                                    if (part.startsWith("@")) {
                                      return (
                                        <span
                                          key={pIdx}
                                          className={cn(
                                            "font-semibold rounded px-1 py-0.2 mx-0.5",
                                            isMe
                                              ? "bg-primary-foreground/25 text-primary-foreground underline underline-offset-2"
                                              : "bg-primary/15 text-primary dark:text-primary-foreground dark:bg-primary/30"
                                          )}
                                        >
                                          {part}
                                        </span>
                                      );
                                    }
                                    return part;
                                  });
                                })()}
                              </p>
                            )}

                            {/* Image/File Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {msg.attachments.map((file, fIdx) => {
                                  const isImg = file.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
                                  return isImg ? (
                                    <div
                                      key={fIdx}
                                      className="relative group/img overflow-hidden rounded-xl border border-border/50 max-w-[280px] sm:max-w-[340px] cursor-pointer"
                                      onClick={() => setFullscreenImage(file.url)}
                                    >
                                      <img
                                        src={file.url}
                                        alt={file.name}
                                        className="w-full max-h-56 object-cover rounded-xl transition-transform group-hover/img:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs gap-1">
                                        <Maximize2 className="size-3.5" />
                                        <span>Click to enlarge</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <a
                                      key={fIdx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors",
                                        isMe
                                          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20"
                                          : "bg-background/80 hover:bg-background text-foreground border-border"
                                      )}
                                    >
                                      <FileText className="size-4 shrink-0" />
                                      <span className="truncate max-w-[180px] font-medium">{file.name}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hover Actions: Reaction Picker, Reply Button, Pin Button, Edit Button, and Unsend Button */}
                        {!msg.is_deleted && (
                          <div
                            className={cn(
                              "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0",
                              isMe ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <MessageReactionsTrigger
                              commentId={msg.id}
                              reactions={msg.reactions || []}
                              currentUserId={currentUser?.id || ""}
                              isMe={isMe}
                              disabled={!isEnabled && userRole !== "ADMIN"}
                              onToggleReaction={handleToggleReaction}
                            />

                            {/* Reply Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingMessage(null);
                                setReplyingTo(msg);
                              }}
                              disabled={!isEnabled && userRole !== "ADMIN"}
                              className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                              title="Reply to message"
                            >
                              <Reply className="size-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTogglePin(msg.id, !msg.is_pinned)}
                              disabled={!isEnabled && userRole !== "ADMIN"}
                              className={cn(
                                "size-7 rounded-full text-muted-foreground hover:text-foreground",
                                msg.is_pinned && "text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 bg-amber-500/10"
                              )}
                              title={msg.is_pinned ? "Unpin message" : "Pin message"}
                            >
                              <Pin className={cn("size-3.5", msg.is_pinned && "fill-amber-500 text-amber-500")} />
                            </Button>

                            {/* Edit Message Button (own message) */}
                            {isMe && !msg.is_deleted && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(msg)}
                                disabled={!isEnabled && userRole !== "ADMIN"}
                                className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                                title="Edit message"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}

                            {/* Unsend / Delete message (own message or Admin) */}
                            {(isMe || userRole === "ADMIN") && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setUnsendConfirmId(msg.id)}
                                disabled={!isEnabled && userRole !== "ADMIN"}
                                className="size-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title={isMe ? "Unsend message" : "Delete message (Admin)"}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reactions Badge Display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                          <MessageReactionsBadge
                            commentId={msg.id}
                            reactions={msg.reactions}
                            currentUserId={currentUser?.id || ""}
                            disabled={!isEnabled && userRole !== "ADMIN"}
                            onToggleReaction={handleToggleReaction}
                          />
                        </div>
                      )}

                      {!isSameAsNext && (
                        <div
                          className={cn(
                            "text-[10px] text-muted-foreground/80 mt-1 px-1 select-none flex items-center gap-1",
                            isMe ? "justify-end" : "justify-start"
                          )}
                          title={format(new Date(msg.created_at), "PPpp")}
                        >
                          {msg.is_edited && <span>Edited &bull;</span>}
                          <span>{isMe ? `Sent ${getRelativeTime(msg.created_at)}` : getRelativeTime(msg.created_at)}</span>
                        </div>
                      )}

                      {/* Messenger-style Seen Avatars */}
                      {(() => {
                        const seenUsers = seenUsersByMessageId.get(msg.id);
                        if (!seenUsers || seenUsers.length === 0) return null;

                        return (
                          <div className={cn("flex items-center gap-1 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
                            <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
                              {seenUsers.map((u) => {
                                const initials = (u.name || "U")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2);

                                return (
                                  <Avatar
                                    key={u.id}
                                    title={`Seen by ${u.name}`}
                                    className="size-4 rounded-full border border-background shadow-2xs ring-1 ring-border/50 shrink-0"
                                  >
                                    <AvatarImage src={u.avatar} alt={u.name} />
                                    <AvatarFallback className="text-[7px] font-bold bg-primary/20 text-primary">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          )}

        </CardContent>

        {/* Input Footer Area */}
        <CardFooter className="p-3 border-t border-border/70 bg-muted/20 flex flex-col gap-2 shrink-0">
          {/* Typing indicator directly above input container */}
          {typingUsers.length > 0 && (
            <div className="w-full flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-0 duration-150 pl-0.5">
              <div className="flex items-center gap-1.5 bg-background dark:bg-card px-2.5 py-1 rounded-full border border-border/70 text-[11px] shadow-2xs">
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

          {/* Replying Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border border-border/70 rounded-xl text-xs w-full animate-in fade-in-50 duration-150">
              <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                <Reply className="size-3.5 text-primary shrink-0" />
                <span className="shrink-0">
                  Replying to <strong className="text-foreground">{replyingTo.sender?.full_name || "Team Member"}</strong>:
                </span>
                <span className="truncate italic text-muted-foreground/90 max-w-[200px] sm:max-w-[400px]">
                  {replyingTo.is_deleted ? "Deleted message" : replyingTo.message || "Attachment"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm shrink-0 transition-colors ml-2"
                title="Cancel reply"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Editing Banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-xl text-xs w-full animate-in fade-in-50 duration-150">
              <div className="flex items-center gap-1.5 text-primary truncate">
                <Pencil className="size-3.5 shrink-0" />
                <span className="shrink-0 font-medium">Editing message:</span>
                <span className="truncate italic text-foreground max-w-[200px] sm:max-w-[400px]">
                  {editingMessage.message}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm shrink-0 transition-colors ml-2"
                title="Cancel edit"
              >
                <X className="size-3.5" />
              </button>
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
              className="size-9 rounded-full shrink-0"
              title="Attach screenshot or file"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="size-4 text-muted-foreground" />
              )}
            </Button>

            {/* Redesigned Seamless Pill Input Container (No overlapping border) */}
            <div className="relative flex-1 flex items-center bg-background border border-border/80 rounded-full focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all px-3 py-0.5 min-w-0">
              {/* @Mention Autocomplete Dropdown Popup */}
              {mentionQuery !== null && filteredMentionOptions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-72 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50 p-1 divide-y divide-border/40 animate-in fade-in-0 zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                    <AtSign className="size-3 text-primary" />
                    <span>Members & Roles</span>
                  </div>
                  <div className="py-0.5">
                    {filteredMentionOptions.map((opt, idx) => {
                      const isSelected = idx === mentionIndex;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => insertMention(opt.label)}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors",
                            isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                          )}
                        >
                          {opt.isEveryone ? (
                            <div className={cn("size-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0", isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary")}>
                              @
                            </div>
                          ) : (
                            <Avatar className="size-6 rounded-full shrink-0 border border-border/50">
                              <AvatarImage src={opt.avatar_url} alt={opt.label} />
                              <AvatarFallback className="text-[9px] font-bold">
                                {opt.label.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="font-semibold text-xs truncate">@{opt.label}</div>
                            <div className={cn("text-[10px] truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {opt.sublabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                disabled={!isEnabled && userRole !== "ADMIN"}
                onChange={(e) => {
                  handleInputChange(e);
                  handleUserTyping();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  editingMessage
                    ? "Edit message... (Enter to save, Esc to cancel)"
                    : !isEnabled && userRole !== "ADMIN"
                    ? "Chat is currently locked by administrator..."
                    : `Message ${title}... (Enter to send, Shift+Enter for new line)`
                }
                className="min-h-9 max-h-28 py-2 text-xs border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none bg-transparent resize-none flex-1"
              />

              <ChatEmojiPicker
                disabled={!isEnabled && userRole !== "ADMIN"}
                onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
                variant="ghost"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              />
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={
                uploading ||
                (!inputText.trim() && attachments.length === 0) ||
                (!isEnabled && userRole !== "ADMIN")
              }
              className="size-9 rounded-full shrink-0 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
              title={editingMessage ? "Save edit" : "Send message"}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>

      {/* Pinned Messages Dialog */}
      <Dialog open={pinnedModalOpen} onOpenChange={setPinnedModalOpen}>
        <DialogContent className="max-w-lg p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pin className="size-4 text-amber-500 fill-amber-500" />
              Pinned Messages ({pinnedMessages.length})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Important notices and pinned messages in {title}.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 mt-2">
            {pinnedMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No pinned messages yet.
              </p>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/60 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">
                        {msg.sender?.full_name || "Team Member"}
                      </span>
                      {getRoleBadge(msg.sender?.role)}
                      <span className="text-[10px] text-muted-foreground">
                        {msg.pinned_at ? format(new Date(msg.pinned_at), "MMM d, h:mm a") : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPinnedModalOpen(false);
                          jumpToMessage(msg.id);
                        }}
                        className="h-6 text-[11px] px-2 text-primary"
                      >
                        Jump
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePin(msg.id, false)}
                        className="size-6 text-muted-foreground hover:text-destructive"
                        title="Unpin message"
                      >
                        <PinOff className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Unsend Confirmation Dialog */}
      <Dialog open={Boolean(unsendConfirmId)} onOpenChange={(open) => !open && setUnsendConfirmId(null)}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="size-4" />
              Unsend message?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Are you sure you want to unsend this message? It will be removed from the conversation for everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnsendConfirmId(null)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmUnsend}
              className="text-xs h-8"
            >
              Unsend
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
