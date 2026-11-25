import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { chatType } = await request.json();
    if (!chatType || !["pm", "dev", "staff"].includes(chatType)) {
      return NextResponse.json({ error: "Invalid chatType" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("group_chat_reads")
      .upsert(
        {
          user_id: user.id,
          chat_type: chatType,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chat_type" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, chatType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
