import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendNotification, notifyAdmins } from "@/lib/notifications";

// GET /api/tickets/[id] -> get single ticket details with comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "15", 10);
    const limit = isNaN(limitParam) || limitParam <= 0 ? 15 : limitParam;
    const before = url.searchParams.get("before");

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile for role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";
    const isStaff = userRole === "ADMIN" || userRole === "PM" || userRole === "DEV";

    // 1. Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*, system_types(name), client:client_id(full_name, email, role), assigned_pm:assigned_pm_id(full_name, email), assigned_dev:assigned_dev_id(full_name, email)")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Hide is_human_error tag from CLIENT role (visible only to DEV, PM, ADMIN)
    if (!isStaff && ticket) {
      delete (ticket as any).is_human_error;
    }

    // 2. Fetch total count of comments for this ticket (staff sees internal, client only sees public)
    let countQuery = supabase
      .from("ticket_comments")
      .select("*", { count: "exact", head: true })
      .eq("ticket_id", id);

    if (!isStaff) {
      countQuery = countQuery.eq("is_internal", false);
    }

    const { count: totalCommentsCount } = await countQuery;

    // 3. Fetch conversation comments with pagination (15 latest by default or before timestamp)
    let query = supabase
      .from("ticket_comments")
      .select("*, author:user_id(full_name, email, role), reactions:comment_reactions(id, emoji, user_id, created_at, user:profiles(id, full_name, email, role))")
      .eq("ticket_id", id);

    if (!isStaff) {
      query = query.eq("is_internal", false);
    }

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: rawComments, error: commentsError } = await query
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (commentsError) {
      return NextResponse.json({ error: commentsError.message }, { status: 400 });
    }

    const hasMore = (rawComments?.length || 0) > limit;
    const sliced = (rawComments || []).slice(0, limit);
    // Reverse to chronological order (oldest to newest in the chunk)
    const comments = sliced.reverse();

    return NextResponse.json({
      ticket,
      comments,
      hasMore,
      totalCount: totalCommentsCount ?? (rawComments?.length || 0),
      currentUserId: user.id,
      currentUserName: profile?.full_name || user.email?.split("@")[0] || "User",
      currentUserRole: userRole,
      isStaff,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tickets/[id] -> post a comment in the ticket conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content, attachments } = await request.json();

    const trimmedContent = (content || "").trim();
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!trimmedContent && !hasAttachments) {
      return NextResponse.json(
        { error: "Please enter a message or attach a file." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user role and ticket status
    const [{ data: profile }, { data: ticket }] = await Promise.all([
      supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single(),
      supabase.from("tickets").select("id, ticket_number, title, status, client_id, assigned_pm_id, assigned_dev_id").eq("id", id).single(),
    ]);

    const userRole = profile?.role || "CLIENT";
    const senderName = profile?.full_name || user.email?.split("@")[0] || "User";
    const isStaff = userRole === "ADMIN" || userRole === "PM" || userRole === "DEV";
    const isClosed = ticket?.status === "RESOLVED" || ticket?.status === "REJECTED";

    // 2. Block client if issue is resolved/closed
    if (isClosed && !isStaff) {
      return NextResponse.json(
        { error: "This issue has been resolved and closed. You are not allowed to chat anymore." },
        { status: 403 }
      );
    }

    // 3. If closed and sent by staff, mark as internal so client cannot see it
    const isInternal = isClosed;

    const { data: comment, error: commentError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: id,
        user_id: user.id,
        content: trimmedContent,
        attachments: hasAttachments ? attachments : [],
        is_internal: isInternal,
      })
      .select("*, author:user_id(full_name, email, role)")
      .single();

    if (commentError) {
      console.error("Comment insert error:", commentError);
      return NextResponse.json({ error: commentError.message }, { status: 400 });
    }

    // Trigger Ticket Response Notifications
    try {
      const preview = trimmedContent
        ? trimmedContent.slice(0, 60)
        : hasAttachments
        ? "Sent an attachment"
        : "Sent a message";

      const recipients = new Set<string>();

      // Notify client (if not sender and comment is not internal staff note)
      if (ticket?.client_id && ticket.client_id !== user.id && !isInternal) {
        recipients.add(ticket.client_id);
      }
      // Notify assigned PM
      if (ticket?.assigned_pm_id && ticket.assigned_pm_id !== user.id) {
        recipients.add(ticket.assigned_pm_id);
      }
      // Notify assigned Dev
      if (ticket?.assigned_dev_id && ticket.assigned_dev_id !== user.id) {
        recipients.add(ticket.assigned_dev_id);
      }

      for (const recipientId of recipients) {
        await sendNotification({
          userId: recipientId,
          type: "TICKET_RESPONSE",
          title: ticket?.title || "Ticket",
          message: `${senderName}: ${preview}`,
          ticketId: id,
          ticketNumber: ticket?.ticket_number,
          ticketStatus: ticket?.status,
          actorId: user.id,
          actorName: senderName,
          actionUrl: `/tickets/${id}`,
          groupKey: `ticket-${id}`,
        });
      }

      // Notify Admins
      await notifyAdmins(
        {
          type: "TICKET_RESPONSE",
          title: ticket?.title || "Ticket",
          message: `${senderName}: ${preview}`,
          ticketId: id,
          ticketNumber: ticket?.ticket_number,
          ticketStatus: ticket?.status,
          actorId: user.id,
          actorName: senderName,
          actionUrl: `/tickets/${id}`,
          groupKey: `ticket-${id}`,
        },
        user.id
      );
    } catch (notifErr) {
      console.error("Failed to send comment notification:", notifErr);
    }

    return NextResponse.json({ success: true, comment });
  } catch (err: unknown) {
    console.error("POST comment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to post comment" },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] -> Update ticket status or assignments (PM / DEV / ADMIN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const {
      status,
      assignedDevId,
      priority,
      pmNotes,
      devNotes,
      rejectionReason,
      isHumanError,
      is_human_error,
      systemTypeId,
      choiceId,
      transferReason,
    } = await request.json();

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updatePayload.status = status;
    if (priority) updatePayload.priority = priority;
    if (assignedDevId !== undefined) updatePayload.assigned_dev_id = assignedDevId;
    if (pmNotes !== undefined) updatePayload.pm_notes = pmNotes;
    if (devNotes !== undefined) updatePayload.dev_notes = devNotes;
    if (rejectionReason !== undefined) updatePayload.rejection_reason = rejectionReason;
    if (isHumanError !== undefined) {
      updatePayload.is_human_error = Boolean(isHumanError);
    } else if (is_human_error !== undefined) {
      updatePayload.is_human_error = Boolean(is_human_error);
    }

    // Ticket Transfer to another system (Only PM and ADMIN)
    let transferNotice: { oldSystemName: string; newSystemName: string } | null = null;
    if (systemTypeId) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .single();

      if (userProfile?.role !== "PM" && userProfile?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only PMs and Admins can transfer tickets to another system." },
          { status: 403 }
        );
      }

      const [{ data: oldTicket }, { data: newSystem }] = await Promise.all([
        supabase
          .from("tickets")
          .select("id, ticket_number, title, system_type_id, system_types(name)")
          .eq("id", id)
          .single(),
        supabase
          .from("system_types")
          .select("id, name")
          .eq("id", systemTypeId)
          .single(),
      ]);

      const oldSystemName = (oldTicket as any)?.system_types?.name || "Previous System";
      const newSystemName = newSystem?.name || "New System";

      updatePayload.system_type_id = systemTypeId;
      updatePayload.choice_id = choiceId || null;
      updatePayload.assigned_dev_id = null; // Clear assigned developer on system transfer
      updatePayload.status = "OPEN"; // Reset status to OPEN for new PM triage

      transferNotice = { oldSystemName, newSystemName };
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from("tickets")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Trigger Status, Assignment, or Transfer Notifications
    try {
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      const actorName = actorProfile?.full_name || user.email?.split("@")[0] || "Staff";

      // Transfer system notice and notifications
      if (transferNotice) {
        const noteText = transferReason?.trim() ? ` Reason: ${transferReason.trim()}` : "";
        const noticeMsg = `[System Notice] Ticket transferred from "${transferNotice.oldSystemName}" to "${transferNotice.newSystemName}" by ${actorName}.${noteText}`;

        await supabase.from("ticket_comments").insert({
          ticket_id: id,
          user_id: user.id,
          content: noticeMsg,
          is_internal: false,
        });

        // Notify new category PMs
        const { data: newCategoryPms } = await supabase
          .from("profiles")
          .select("id, assigned_system_type_id")
          .eq("role", "PM");

        if (newCategoryPms && newCategoryPms.length > 0) {
          for (const pm of newCategoryPms) {
            if (pm.id === user.id) continue;
            if (pm.assigned_system_type_id && pm.assigned_system_type_id !== systemTypeId) continue;

            await sendNotification({
              userId: pm.id,
              type: "TICKET_NEW",
              title: `Transferred: ${updatedTicket?.title || "Ticket"}`,
              message: `Ticket transferred to ${transferNotice.newSystemName} by ${actorName}`,
              ticketId: id,
              ticketNumber: updatedTicket?.ticket_number,
              ticketStatus: "OPEN",
              actorId: user.id,
              actorName,
              actionUrl: `/tickets/${id}`,
              groupKey: `ticket-${id}`,
            });
          }
        }

        // Notify Admins
        await notifyAdmins(
          {
            type: "TICKET_STATUS",
            title: `Transferred: ${updatedTicket?.title || "Ticket"}`,
            message: `Ticket ${updatedTicket?.ticket_number} transferred from ${transferNotice.oldSystemName} to ${transferNotice.newSystemName} by ${actorName}`,
            ticketId: id,
            ticketNumber: updatedTicket?.ticket_number,
            ticketStatus: "OPEN",
            actorId: user.id,
            actorName,
            actionUrl: `/tickets/${id}`,
            groupKey: `ticket-${id}`,
          },
          user.id
        );
      }

      // 1. Status change notification
      if (status) {
        const recipients = new Set<string>();
        if (updatedTicket.client_id && updatedTicket.client_id !== user.id) {
          recipients.add(updatedTicket.client_id);
        }
        if (updatedTicket.assigned_pm_id && updatedTicket.assigned_pm_id !== user.id) {
          recipients.add(updatedTicket.assigned_pm_id);
        }
        if (updatedTicket.assigned_dev_id && updatedTicket.assigned_dev_id !== user.id) {
          recipients.add(updatedTicket.assigned_dev_id);
        }

        for (const recipientId of recipients) {
          await sendNotification({
            userId: recipientId,
            type: "TICKET_STATUS",
            title: updatedTicket.title || "Ticket",
            message: `Status changed to ${status} by ${actorName}`,
            ticketId: updatedTicket.id,
            ticketNumber: updatedTicket.ticket_number,
            ticketStatus: status,
            actorId: user.id,
            actorName,
            actionUrl: `/tickets/${updatedTicket.id}`,
            groupKey: `ticket-${updatedTicket.id}`,
          });
        }

        // Notify Admins
        await notifyAdmins(
          {
            type: "TICKET_STATUS",
            title: updatedTicket.title || "Ticket",
            message: `Status changed to ${status} by ${actorName}`,
            ticketId: updatedTicket.id,
            ticketNumber: updatedTicket.ticket_number,
            ticketStatus: status,
            actorId: user.id,
            actorName,
            actionUrl: `/tickets/${updatedTicket.id}`,
            groupKey: `ticket-${updatedTicket.id}`,
          },
          user.id
        );
      }

      // 2. Dev Assignment notification
      if (assignedDevId && assignedDevId !== user.id) {
        await sendNotification({
          userId: assignedDevId,
          type: "TICKET_ASSIGNED",
          title: updatedTicket.title || "Ticket",
          message: `You were assigned to "${updatedTicket.title}" by ${actorName}`,
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticket_number,
          ticketStatus: updatedTicket.status,
          actorId: user.id,
          actorName,
          actionUrl: `/tickets/${updatedTicket.id}`,
          groupKey: `ticket-${updatedTicket.id}`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send update notification:", notifErr);
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch {
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

