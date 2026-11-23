import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isClient = !profile || profile.role === "CLIENT";
  if (!isClient) {
    return NextResponse.json(
      { error: "Only clients can report a ticket conversation." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { reason } = body;

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { error: "Please provide a valid reason for the report." },
      { status: 400 }
    );
  }

  // Verify ticket exists
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, ticket_number, title")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Insert report
  const { data: report, error: insertError } = await supabase
    .from("ticket_reports")
    .insert({
      ticket_id: ticketId,
      reporter_id: user.id,
      reason: reason.trim(),
      status: "PENDING",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Failed to submit report" },
      { status: 500 }
    );
  }

  // Notify Admins about the Incident Report
  try {
    const { data: reporterProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const reporterName = reporterProfile?.full_name || user.email?.split("@")[0] || "Client";

    await notifyAdmins(
      {
        type: "REPORT_NEW",
        title: "Incident Report",
        message: `${reporterName} reported: "${reason.trim().slice(0, 60)}"`,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        actorId: user.id,
        actorName: reporterName,
        actionUrl: `/admin-workplace?tab=reports`,
        groupKey: `report-${ticket.id}`,
      },
      user.id
    );
  } catch (notifErr) {
    console.error("Failed to notify admins of report:", notifErr);
  }

  return NextResponse.json({
    success: true,
    message: "Report submitted privately to system administrators.",
    report,
  });
}
