import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";

const VALID_CHAT_TYPES = ["pm", "dev", "staff"] as const;
type ChatType = typeof VALID_CHAT_TYPES[number];

const ROLE_PERMISSIONS: Record<ChatType, string[]> = {
  pm: ["PM", "ADMIN"],
  dev: ["DEV", "ADMIN"],
  staff: ["PM", "DEV", "ADMIN"],
};

const TABLE_MAP: Record<ChatType, string> = {
  pm: "pm_chat_messages",
  dev: "dev_chat_messages",
  staff: "staff_chat_messages",
};

const SETTING_KEY_MAP: Record<ChatType, "pm_chat_enabled" | "dev_chat_enabled" | "staff_chat_enabled"> = {
  pm: "pm_chat_enabled",
  dev: "dev_chat_enabled",
  staff: "staff_chat_enabled",
};

interface ReactionRecord {
  id: string;
  message_id: string;
  emoji: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    role?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    if (!VALID_CHAT_TYPES.includes(type as ChatType)) {
      return NextResponse.json({ error: "Invalid chat room type" }, { status: 400 });
    }

    const chatType = type as ChatType;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, email")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";
    const allowedRoles = ROLE_PERMISSIONS[chatType];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this chat room." },
        { status: 403 }
      );
    }

    // Check chat settings
    const { data: settings } = await supabase
      .from("group_chat_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const settingKey = SETTING_KEY_MAP[chatType];
    const isEnabled = settings ? Boolean(settings[settingKey]) : true;

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const limit = Math.min(Number(searchParams.get("limit")) || 40, 100);
    const pinnedOnly = searchParams.get("pinned_only") === "true";

    const tableName = TABLE_MAP[chatType];

    let query = supabase
      .from(tableName)
      .select("id, user_id, message, attachments, is_pinned, pinned_at, pinned_by, is_deleted, deleted_at, deleted_by, is_edited, edited_at, reply_to_id, created_at, sender:user_id(id, full_name, role, avatar_url, email), pinner:pinned_by(id, full_name), deleter:deleted_by(id, full_name), reply_to:reply_to_id(id, message, is_deleted, sender:user_id(id, full_name, role))")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (pinnedOnly) {
      query = query.eq("is_pinned", true).eq("is_deleted", false);
    } else if (before) {
      query = query.lt("created_at", before);
    }

    const { data: rawMessages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const hasMore = (rawMessages?.length || 0) > limit;
    const sliced = hasMore ? rawMessages.slice(0, limit) : (rawMessages || []);
    // Sort chronologically ascending for chat feed
    const messages = [...sliced].reverse();

    // Fetch reactions for the returned messages (only non-deleted messages have reactions)
    const activeMessageIds = messages.filter((m) => !m.is_deleted).map((m) => m.id);
    const reactionsByMessage: Record<string, ReactionRecord[]> = {};

    if (activeMessageIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from("group_chat_reactions")
        .select("id, message_id, emoji, user_id, created_at, user:profiles(id, full_name, email, role)")
        .eq("chat_type", chatType)
        .in("message_id", activeMessageIds);

      if (reactionsData) {
        reactionsData.forEach((r) => {
          if (!reactionsByMessage[r.message_id]) {
            reactionsByMessage[r.message_id] = [];
          }
          reactionsByMessage[r.message_id].push(r as unknown as ReactionRecord);
        });
      }
    }

    // For non-ADMIN users: if a message is soft-deleted, blank out the text and attachments
    // For ADMIN users: preserve original text and attachments so admin can audit what was deleted
    const sanitizedMessages = messages.map((m) => {
      const isDel = Boolean(m.is_deleted);
      const reactions = isDel ? [] : (reactionsByMessage[m.id] || []);

      if (isDel && userRole !== "ADMIN") {
        return {
          ...m,
          message: "",
          attachments: [],
          reactions: [],
          is_deleted: true,
        };
      }

      return {
        ...m,
        reactions,
        is_deleted: isDel,
      };
    });

    // Fetch pinned messages list if this is the initial load (no 'before' param)
    let pinnedMessages: unknown[] = [];
    if (!before) {
      const { data: pinnedData } = await supabase
        .from(tableName)
        .select("id, user_id, message, attachments, is_pinned, pinned_at, pinned_by, is_deleted, created_at, sender:user_id(id, full_name, role, avatar_url, email), pinner:pinned_by(id, full_name)")
        .eq("is_pinned", true)
        .eq("is_deleted", false)
        .order("pinned_at", { ascending: false });

      pinnedMessages = pinnedData || [];
    }

    // Fetch read receipts for this group chat with user profile info
    const { data: readsData } = await supabase
      .from("group_chat_reads")
      .select("user_id, last_read_at, user:profiles(id, full_name, avatar_url, role)")
      .eq("chat_type", chatType);

    // Fetch allowed members for this chat to support @mentions
    const { data: eligibleMembers } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("role", allowedRoles);

    return NextResponse.json({
      chatType,
      isEnabled,
      userRole,
      currentUser: {
        id: user.id,
        name: profile?.full_name || user.email?.split("@")[0] || "User",
        role: userRole,
        avatar_url: profile?.avatar_url,
      },
      messages: sanitizedMessages,
      reads: readsData || [],
      members: eligibleMembers || [],
      hasMore,
      pinnedMessages,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load chat messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    if (!VALID_CHAT_TYPES.includes(type as ChatType)) {
      return NextResponse.json({ error: "Invalid chat room type" }, { status: 400 });
    }

    const chatType = type as ChatType;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_url, email")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";
    const allowedRoles = ROLE_PERMISSIONS[chatType];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to post in this chat room." },
        { status: 403 }
      );
    }

    // Check chat settings
    const { data: settings } = await supabase
      .from("group_chat_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const settingKey = SETTING_KEY_MAP[chatType];
    const isEnabled = settings ? Boolean(settings[settingKey]) : true;

    if (!isEnabled && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "This chat room has been disabled by the administrator." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const messageText = (body.message || "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const replyToId = body.reply_to_id || null;

    if (!messageText && attachments.length === 0) {
      return NextResponse.json(
        { error: "Message content or attachment is required." },
        { status: 400 }
      );
    }

    const tableName = TABLE_MAP[chatType];
    const { data: inserted, error: insertErr } = await supabase
      .from(tableName)
      .insert({
        user_id: user.id,
        message: messageText,
        attachments,
        reply_to_id: replyToId,
      })
      .select("id, user_id, message, attachments, is_pinned, pinned_at, pinned_by, is_deleted, deleted_at, deleted_by, is_edited, edited_at, reply_to_id, created_at, sender:user_id(id, full_name, role, avatar_url, email), pinner:pinned_by(id, full_name), reply_to:reply_to_id(id, message, is_deleted, sender:user_id(id, full_name, role))")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    // Process @everyone and @<fullname> mentions for notifications
    try {
      const senderName = profile?.full_name || user.email?.split("@")[0] || "Team Member";
      const chatRoomName = chatType === "pm" ? "PM Chat" : chatType === "dev" ? "Dev Chat" : "Staff Chat";
      const actionUrl = `/${chatType}-chat`;

      const { data: eligibleProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", allowedRoles);

      const targetUserIds = new Set<string>();

      // Check for @everyone or @all (case-insensitive)
      const hasEveryone = /@(everyone|all)\b/i.test(messageText);

      if (hasEveryone) {
        eligibleProfiles?.forEach((p) => {
          if (p.id !== user.id) {
            targetUserIds.add(p.id);
          }
        });
      } else {
        // Match specific names: e.g. @Full Name or @"Full Name" or @FirstName
        eligibleProfiles?.forEach((p) => {
          if (p.id === user.id || !p.full_name) return;
          const escapedName = p.full_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const nameRegex = new RegExp(`@${escapedName}\\b`, "i");
          if (nameRegex.test(messageText)) {
            targetUserIds.add(p.id);
          }
        });
      }

      for (const targetId of targetUserIds) {
        await sendNotification({
          userId: targetId,
          type: "CHAT_MENTION",
          title: `${chatRoomName}: Mention from ${senderName}`,
          message: `${senderName}: ${messageText.slice(0, 80)}`,
          actorId: user.id,
          actorName: senderName,
          actionUrl,
          groupKey: `chat-${chatType}`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send chat mention notifications:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: { ...inserted, reactions: [], is_deleted: false },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// PATCH /api/group-chats/[type] -> Pin / Unpin or Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    if (!VALID_CHAT_TYPES.includes(type as ChatType)) {
      return NextResponse.json({ error: "Invalid chat room type" }, { status: 400 });
    }

    const chatType = type as ChatType;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";
    const allowedRoles = ROLE_PERMISSIONS[chatType];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify messages in this chat." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const tableName = TABLE_MAP[chatType];

    // Case 1: Edit message content
    if (body.action === "edit" || (body.messageId && typeof body.message === "string" && !("is_pinned" in body))) {
      const messageId = body.messageId;
      const newText = (body.message || "").trim();

      if (!newText) {
        return NextResponse.json(
          { error: "Message content cannot be empty." },
          { status: 400 }
        );
      }

      // Check message ownership
      const { data: targetMsg, error: fetchErr } = await supabase
        .from(tableName)
        .select("id, user_id, is_deleted")
        .eq("id", messageId)
        .single();

      if (fetchErr || !targetMsg || targetMsg.is_deleted) {
        return NextResponse.json({ error: "Message not found or deleted" }, { status: 404 });
      }

      if (targetMsg.user_id !== user.id && userRole !== "ADMIN") {
        return NextResponse.json({ error: "You can only edit your own messages." }, { status: 403 });
      }

      const now = new Date().toISOString();
      const { data: updated, error: updateErr } = await supabase
        .from(tableName)
        .update({
          message: newText,
          is_edited: true,
          edited_at: now,
        })
        .eq("id", messageId)
        .select("id, user_id, message, attachments, is_pinned, pinned_at, pinned_by, is_deleted, deleted_at, deleted_by, is_edited, edited_at, reply_to_id, created_at, sender:user_id(id, full_name, role, avatar_url, email), pinner:pinned_by(id, full_name), deleter:deleted_by(id, full_name), reply_to:reply_to_id(id, message, is_deleted, sender:user_id(id, full_name, role))")
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: updated,
      });
    }

    // Case 2: Pin / Unpin message
    const { messageId, is_pinned } = body;

    if (!messageId || typeof is_pinned !== "boolean") {
      return NextResponse.json(
        { error: "messageId and is_pinned boolean are required" },
        { status: 400 }
      );
    }

    const updateData = is_pinned
      ? {
          is_pinned: true,
          pinned_at: new Date().toISOString(),
          pinned_by: user.id,
        }
      : {
          is_pinned: false,
          pinned_at: null,
          pinned_by: null,
        };

    const { data: updated, error: updateErr } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", messageId)
      .select("id, user_id, message, attachments, is_pinned, pinned_at, pinned_by, is_deleted, deleted_at, deleted_by, is_edited, edited_at, reply_to_id, created_at, sender:user_id(id, full_name, role, avatar_url, email), pinner:pinned_by(id, full_name), deleter:deleted_by(id, full_name), reply_to:reply_to_id(id, message, is_deleted, sender:user_id(id, full_name, role))")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/group-chats/[type] -> Soft delete / unsend a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    if (!VALID_CHAT_TYPES.includes(type as ChatType)) {
      return NextResponse.json({ error: "Invalid chat room type" }, { status: 400 });
    }

    const chatType = type as ChatType;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";
    const allowedRoles = ROLE_PERMISSIONS[chatType];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission for this chat." },
        { status: 403 }
      );
    }

    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const tableName = TABLE_MAP[chatType];

    // Fetch the target message
    const { data: targetMsg, error: fetchErr } = await supabase
      .from(tableName)
      .select("id, user_id, is_deleted")
      .eq("id", messageId)
      .single();

    if (fetchErr || !targetMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Permission check: regular user can ONLY unsend their OWN messages, but ADMIN can delete ANY message
    if (userRole !== "ADMIN" && targetMsg.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only unsend your own messages." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from(tableName)
      .update({
        is_deleted: true,
        deleted_at: now,
        deleted_by: user.id,
        is_pinned: false,
      })
      .eq("id", messageId)
      .select("id, user_id, message, attachments, is_pinned, is_deleted, deleted_at, deleted_by, is_edited, edited_at, reply_to_id, created_at, sender:user_id(id, full_name, role, avatar_url, email), deleter:deleted_by(id, full_name), reply_to:reply_to_id(id, message, is_deleted, sender:user_id(id, full_name, role))")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId,
      message: updated,
      deleted_by: user.id,
      deleter_name: profile?.full_name || "User",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
