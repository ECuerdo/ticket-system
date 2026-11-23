import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendNotification, notifyAdmins } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const { title, description, systemTypeId, choiceId, priority, attachments, linkUrl } = await request.json();

    if (!title?.trim() || !description?.trim() || !systemTypeId || !choiceId) {
      return NextResponse.json(
        { error: "Title, description, target system, and issue category are required." },
        { status: 400 }
      );
    }

    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json(
        { error: "At least one attachment (screenshot or PDF) is required." },
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

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        title,
        description,
        system_type_id: systemTypeId,
        choice_id: choiceId || null,
        priority: priority || null,
        status: "OPEN",
        client_id: user.id,
        attachments: attachments || [],
        link_url: linkUrl?.trim() || null,
      })
      .select()
      .single();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 400 });
    }

    // Trigger Notifications for Admins & Category PMs
    try {
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      const creatorName = creatorProfile?.full_name || user.email?.split("@")[0] || "Client";

      // 1. Notify all Admins
      await notifyAdmins(
        {
          type: "TICKET_NEW",
          title: ticket.title || "New Ticket",
          message: `${ticket.title} submitted by ${creatorName}`,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          ticketStatus: "OPEN",
          actorId: user.id,
          actorName: creatorName,
          actionUrl: `/tickets/${ticket.id}`,
          groupKey: `ticket-${ticket.id}`,
        },
        user.id
      );

      // 2. Notify PMs (PM assigned to this category or all PMs if none)
      const { data: categoryPms } = await supabase
        .from("profiles")
        .select("id, assigned_system_type_id")
        .eq("role", "PM");

      if (categoryPms && categoryPms.length > 0) {
        for (const pm of categoryPms) {
          if (pm.id === user.id) continue;
          if (pm.assigned_system_type_id && pm.assigned_system_type_id !== systemTypeId) continue;

          await sendNotification({
            userId: pm.id,
            type: "TICKET_NEW",
            title: ticket.title || "New Ticket",
            message: `${ticket.title} submitted by ${creatorName}`,
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            ticketStatus: "OPEN",
            actorId: user.id,
            actorName: creatorName,
            actionUrl: `/tickets/${ticket.id}`,
            groupKey: `ticket-${ticket.id}`,
          });
        }
      }
    } catch (notifErr) {
      console.error("Failed to send new ticket notification:", notifErr);
    }

    return NextResponse.json({ success: true, ticket });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

