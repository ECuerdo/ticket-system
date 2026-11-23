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
  ticketStatus?: string;
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
    const targetGroup = params.ticketId
      ? `ticket-${params.ticketId}`
      : params.groupKey || null;

    // 1. Try PostgreSQL RPC function (runs with SECURITY DEFINER to bypass RLS)
    const { error: rpcError } = await supabase.rpc("send_or_stack_notification", {
      p_user_id: params.userId,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_ticket_id: params.ticketId || null,
      p_ticket_number: params.ticketNumber || null,
      p_actor_id: params.actorId || null,
      p_actor_name: params.actorName || null,
      p_action_url: params.actionUrl || null,
      p_group_key: targetGroup,
      p_ticket_status: params.ticketStatus || null,
    });

    if (!rpcError) {
      return;
    }

    // 2. Fallback stacking query
    if (targetGroup) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id, stack_count")
        .eq("user_id", params.userId)
        .or(`group_key.eq.${targetGroup},ticket_id.eq.${params.ticketId || "00000000-0000-0000-0000-000000000000"}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("notifications")
          .update({
            stack_count: (existing.stack_count || 1) + 1,
            type: params.type,
            title: params.title,
            message: params.message,
            ticket_status: params.ticketStatus || null,
            actor_id: params.actorId || null,
            actor_name: params.actorName || null,
            action_url: params.actionUrl || null,
            group_key: targetGroup,
            is_read: false,
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
      ticket_status: params.ticketStatus || null,
      actor_id: params.actorId || null,
      actor_name: params.actorName || null,
      action_url: params.actionUrl || null,
      group_key: targetGroup,
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
