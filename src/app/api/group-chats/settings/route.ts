import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from("group_chat_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      settings: settings || {
        pm_chat_enabled: true,
        dev_chat_enabled: true,
        staff_chat_enabled: true,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch group chat settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ADMIN role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.pm_chat_enabled === "boolean") {
      updates.pm_chat_enabled = body.pm_chat_enabled;
    }
    if (typeof body.dev_chat_enabled === "boolean") {
      updates.dev_chat_enabled = body.dev_chat_enabled;
    }
    if (typeof body.staff_chat_enabled === "boolean") {
      updates.staff_chat_enabled = body.staff_chat_enabled;
    }

    const { data: updated, error } = await supabase
      .from("group_chat_settings")
      .upsert({ id: 1, ...updates })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update group chat settings" },
      { status: 500 }
    );
  }
}
