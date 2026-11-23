import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawNotifications, error } = await supabase
      .from("notifications")
      .select("*, ticket:tickets(status)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Deduplicate in-memory to strictly guarantee 1 row per ticket or group
    interface NotificationRow {
      id: string;
      user_id: string;
      type: string;
      title: string;
      message: string;
      ticket_id?: string | null;
      ticket_number?: string | null;
      ticket_status?: string | null;
      actor_id?: string | null;
      actor_name?: string | null;
      action_url?: string | null;
      is_read: boolean;
      group_key?: string | null;
      stack_count: number;
      created_at: string;
      updated_at: string;
    }

    const deduped: NotificationRow[] = [];
    const seen = new Map<string, NotificationRow>();

    for (const item of (rawNotifications || [])) {
      const groupKey = item.ticket_id
        ? `ticket-${item.ticket_id}`
        : (item.group_key || item.id);

      const status = item.ticket_status || (item.ticket as any)?.status || null;

      const existing = seen.get(groupKey);
      if (existing) {
        existing.stack_count = (existing.stack_count || 1) + (item.stack_count || 1);
        if (!item.is_read) {
          existing.is_read = false;
        }
        if (status) {
          existing.ticket_status = status;
        }
      } else {
        const copy: NotificationRow = { ...item, ticket_status: status };
        seen.set(groupKey, copy);
        deduped.push(copy);
      }
    }

    const unreadCount = deduped.filter((n) => !n.is_read).length;

    return NextResponse.json({
      notifications: deduped,
      unreadCount,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.markAllAsRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "All marked as read" });
    }

    if (body.notificationId) {
      const { data: target } = await supabase
        .from("notifications")
        .select("group_key, ticket_id")
        .eq("id", body.notificationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (target?.group_key) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("group_key", target.group_key);
      } else if (target?.ticket_id) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("ticket_id", target.ticket_id);
      } else {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", body.notificationId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true, message: "Marked as read" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update notification" },
      { status: 500 }
    );
  }
}
