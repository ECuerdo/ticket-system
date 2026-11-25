import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Fetch messages
    const tableName = TABLE_MAP[chatType];
    const { data: messages, error } = await supabase
      .from(tableName)
      .select("id, user_id, message, attachments, created_at, sender:user_id(id, full_name, role, avatar_url, email)")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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
      messages: messages || [],
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
      })
      .select("id, user_id, message, attachments, created_at, sender:user_id(id, full_name, role, avatar_url, email)")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: inserted });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
