"use client";

import { useState, useMemo } from "react";
import { SmilePlus, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export const DEFAULT_REACTION_EMOJIS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "😆", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
];

export interface CommentReactionItem {
  id: string;
  comment_id?: string;
  emoji: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

interface MessageReactionsProps {
  commentId: string;
  reactions?: CommentReactionItem[];
  currentUserId: string;
  isMe: boolean;
  disabled?: boolean;
  onToggleReaction: (commentId: string, emoji: string) => Promise<void> | void;
}

export function MessageReactionsTrigger({
  commentId,
  reactions = [],
  currentUserId,
  isMe,
  disabled = false,
  onToggleReaction,
}: MessageReactionsProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (disabled) return null;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          "size-7 rounded-full flex items-center justify-center transition-all duration-150 border border-border/70 shadow-2xs select-none",
          "bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground",
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
          popoverOpen && "opacity-100 bg-muted text-foreground ring-2 ring-primary/30"
        )}
        title="Add reaction"
        aria-label="Add reaction"
      >
        <SmilePlus className="size-3.5" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align={isMe ? "end" : "start"}
        sideOffset={6}
        className="flex-row flex-nowrap w-auto max-w-fit p-1.5 rounded-full bg-background/95 dark:bg-card/95 backdrop-blur-md border border-border/80 shadow-xl items-center gap-1 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {DEFAULT_REACTION_EMOJIS.map((item) => {
          const hasReacted = reactions.some(
            (r) => r.user_id === currentUserId && r.emoji === item.emoji
          );

          return (
            <button
              key={item.emoji}
              type="button"
              onClick={() => {
                onToggleReaction(commentId, item.emoji);
                setPopoverOpen(false);
              }}
              className={cn(
                "size-8 rounded-full flex items-center justify-center text-lg leading-none transition-all duration-150 select-none",
                "hover:scale-130 active:scale-95 hover:bg-muted/80",
                hasReacted && "bg-primary/20 ring-1 ring-primary/50 scale-105"
              )}
              title={item.label}
              aria-label={item.label}
            >
              <span>{item.emoji}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function MessageReactionsBadge({
  commentId,
  reactions = [],
  currentUserId,
  disabled = false,
  onToggleReaction,
}: {
  commentId: string;
  reactions?: CommentReactionItem[];
  currentUserId: string;
  disabled?: boolean;
  onToggleReaction: (commentId: string, emoji: string) => Promise<void> | void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const reactionsByEmoji = useMemo(() => {
    const map: { [emoji: string]: CommentReactionItem[] } = {};
    reactions.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = [];
      map[r.emoji].push(r);
    });
    return map;
  }, [reactions]);

  // Up to 3 unique emojis sorted by frequency
  const topEmojis = useMemo(() => {
    return Object.entries(reactionsByEmoji)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([emoji]) => emoji);
  }, [reactionsByEmoji]);

  const hasMyReaction = useMemo(() => {
    return reactions.some((r) => r.user_id === currentUserId);
  }, [reactions, currentUserId]);

  if (reactions.length === 0) return null;

  const filteredReactions =
    selectedFilter === "all"
      ? reactions
      : reactions.filter((r) => r.emoji === selectedFilter);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedFilter("all");
          setModalOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all shadow-2xs border select-none",
          "hover:scale-105 active:scale-95 cursor-pointer",
          hasMyReaction
            ? "bg-primary/10 border-primary/40 text-primary dark:bg-primary/20 dark:text-primary-foreground hover:bg-primary/15"
            : "bg-background/90 dark:bg-muted/70 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="View reactors"
      >
        <span className="flex items-center -space-x-1">
          {topEmojis.map((emoji) => (
            <span key={emoji} className="text-xs inline-block transform hover:scale-110 transition-transform">
              {emoji}
            </span>
          ))}
        </span>
        <span className="text-[11px] font-semibold">{reactions.length}</span>
      </button>

      {/* Reactors Pop-up Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background dark:bg-card border-border shadow-xl">
          <DialogHeader className="p-4 pb-3 border-b border-border/60">
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Reactions</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {reactions.length} total
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              See who reacted to this message.
            </DialogDescription>
          </DialogHeader>

          {/* Emoji Filter Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-muted/20 overflow-x-auto text-xs">
            <Button
              type="button"
              variant={selectedFilter === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 rounded-full"
              onClick={() => setSelectedFilter("all")}
            >
              All {reactions.length}
            </Button>
            {Object.entries(reactionsByEmoji).map(([emoji, list]) => (
              <Button
                key={emoji}
                type="button"
                variant={selectedFilter === emoji ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full flex items-center gap-1"
                onClick={() => setSelectedFilter(emoji)}
              >
                <span>{emoji}</span>
                <span className="font-semibold">{list.length}</span>
              </Button>
            ))}
          </div>

          {/* Reactor List */}
          <div className="max-h-72 overflow-y-auto p-3 divide-y divide-border/40">
            {filteredReactions.map((reaction) => {
              const isCurrentUser = reaction.user_id === currentUserId;
              const userName = reaction.user?.full_name || reaction.user?.email?.split("@")[0] || "User";
              const userRole = (reaction.user?.role || "USER").toUpperCase();

              return (
                <div
                  key={`${reaction.comment_id || commentId}-${reaction.id}-${reaction.user_id}`}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/40 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-[10px] font-bold bg-muted text-foreground">
                        {userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {userName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            (You)
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1 py-0 uppercase shrink-0 font-medium",
                            userRole === "CLIENT" && "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10",
                            userRole === "PM" && "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
                            userRole === "DEV" && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                            userRole === "ADMIN" && "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                          )}
                        >
                          {userRole}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {reaction.user?.email || ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl select-none" title={reaction.emoji}>
                      {reaction.emoji}
                    </span>

                    {/* Allow user to remove their own reaction directly from the modal */}
                    {isCurrentUser && !disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        title="Remove reaction"
                        onClick={async () => {
                          await onToggleReaction(commentId, reaction.emoji);
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
