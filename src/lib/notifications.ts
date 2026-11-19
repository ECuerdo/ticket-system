import { createClient as createSupabaseServerClient } from "@supabase/supabase-js";

// Helper client with service/direct access or env keys for notification dispatch
function getNotifyClient() {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export type NotificationType =
  | "TICKET_RESPONSE"
  | "TICKET_REACT"
  | "TICKET_STATUS"
  | "TICKET_NEW"
  | "TICKET_ASSIGNED"
  | "REPORT_NEW"
  | "PASSWORD_CHANGED"
  | "USER_REGISTERED";

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId?: string;
  ticketNumber?: string;
  actorId?: string;
  actorName?: string;
  actionUrl?: string;
  groupKey?: string;
}

/**
 * Creates or stacks a notification for a user.
 */
export async function sendNotification(params: SendNotificationParams) {
  try {
    const supabase = getNotifyClient();

    // Stacking check: if an unread notification with the same group_key exists, stack it
    if (params.groupKey) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id, stack_count")
        .eq("user_id", params.userId)
        .eq("group_key", params.groupKey)
        .eq("is_read", false)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("notifications")
          .update({
            stack_count: (existing.stack_count || 1) + 1,
            title: params.title,
            message: params.message,
            actor_id: params.actorId || null,
            actor_name: params.actorName || null,
            action_url: params.actionUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        return;
      }
    }

    // Insert new notification
    await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      ticket_id: params.ticketId || null,
      ticket_number: params.ticketNumber || null,
      actor_id: params.actorId || null,
      actor_name: params.actorName || null,
      action_url: params.actionUrl || null,
      group_key: params.groupKey || null,
      stack_count: 1,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}

/**
 * Helper to notify all admins.
 */
export async function notifyAdmins(
  params: Omit<SendNotificationParams, "userId">,
  excludeUserId?: string
) {
  try {
    const supabase = getNotifyClient();
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "ADMIN");

    if (!admins) return;

    for (const admin of admins) {
      if (excludeUserId && admin.id === excludeUserId) continue;
      await sendNotification({
        ...params,
        userId: admin.id,
      });
    }
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}
