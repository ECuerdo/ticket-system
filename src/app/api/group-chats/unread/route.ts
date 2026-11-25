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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "CLIENT";
    if (role === "CLIENT") {
      return NextResponse.json({ unread: { pm: 0, dev: 0, staff: 0 } });
    }

    // Fetch user's last_read_at timestamps
    const { data: reads } = await supabase
      .from("group_chat_reads")
      .select("chat_type, last_read_at")
      .eq("user_id", user.id);

    const readMap: Record<string, string> = {};
    if (reads) {
      reads.forEach((r) => {
        readMap[r.chat_type] = r.last_read_at;
      });
    }

    // Role visibility:
    // PM: PM chat, Staff chat
    // DEV: Dev chat, Staff chat
    // ADMIN: PM chat, Dev chat, Staff chat
    const canAccessPm = role === "PM" || role === "ADMIN";
    const canAccessDev = role === "DEV" || role === "ADMIN";
    const canAccessStaff = role === "PM" || role === "DEV" || role === "ADMIN";

    const defaultEpoch = new Date(0).toISOString();

    const [pmCount, devCount, staffCount] = await Promise.all([
      canAccessPm
        ? supabase
            .from("pm_chat_messages")
            .select("id", { count: "exact", head: true })
            .gt("created_at", readMap.pm || defaultEpoch)
            .neq("user_id", user.id)
            .eq("is_deleted", false)
        : Promise.resolve({ count: 0 }),
      canAccessDev
        ? supabase
            .from("dev_chat_messages")
            .select("id", { count: "exact", head: true })
            .gt("created_at", readMap.dev || defaultEpoch)
            .neq("user_id", user.id)
            .eq("is_deleted", false)
        : Promise.resolve({ count: 0 }),
      canAccessStaff
        ? supabase
            .from("staff_chat_messages")
            .select("id", { count: "exact", head: true })
            .gt("created_at", readMap.staff || defaultEpoch)
            .neq("user_id", user.id)
            .eq("is_deleted", false)
        : Promise.resolve({ count: 0 }),
    ]);

    return NextResponse.json({
      unread: {
        pm: pmCount.count || 0,
        dev: devCount.count || 0,
        staff: staffCount.count || 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
