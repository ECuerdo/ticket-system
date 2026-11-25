import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ChatType = "pm" | "dev" | "staff";
const VALID_CHAT_TYPES: ChatType[] = ["pm", "dev", "staff"];

const ROLE_PERMISSIONS: Record<ChatType, string[]> = {
  pm: ["PM", "ADMIN"],
  dev: ["DEV", "ADMIN"],
  staff: ["PM", "DEV", "ADMIN"],
};

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
    const { messageId, emoji } = await request.json();

    if (!messageId || !emoji) {
      return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";
    const allowedRoles = ROLE_PERMISSIONS[chatType];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission for this chat room." },
        { status: 403 }
      );
    }

    // Check if user already reacted with this emoji on this message
    const { data: existing, error: fetchErr } = await supabase
      .from("group_chat_reactions")
      .select("id")
      .eq("chat_type", chatType)
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    let action: "added" | "removed" = "added";

    if (existing) {
      // Toggle off: Delete reaction
      const { error: deleteErr } = await supabase
        .from("group_chat_reactions")
        .delete()
        .eq("id", existing.id);

      if (deleteErr) {
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }
      action = "removed";
    } else {
      // Add reaction
      const { error: insertErr } = await supabase
        .from("group_chat_reactions")
        .insert({
          chat_type: chatType,
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      action = "added";
    }

    return NextResponse.json({
      success: true,
      action,
      messageId,
      emoji,
      userId: user.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
