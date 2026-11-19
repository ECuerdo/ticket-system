import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
  }

  // Fetch reports ordered by created_at DESC
  const { data: reports, error: reportsError } = await supabase
    .from("ticket_reports")
    .select(`
      id,
      ticket_id,
      reporter_id,
      reason,
      status,
      admin_notes,
      created_at,
      updated_at,
      ticket:tickets(
        id,
        ticket_number,
        title,
        status,
        priority,
        created_at,
        system_types(name)
      ),
      reporter:profiles!reporter_id(
        id,
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (reportsError) {
    return NextResponse.json({ error: reportsError.message }, { status: 500 });
  }

  return NextResponse.json({ reports: reports || [] });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { reportId, status, admin_notes } = body;

  if (!reportId) {
    return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (status) updates.status = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;

  const { data: updatedReport, error: updateError } = await supabase
    .from("ticket_reports")
    .update(updates)
    .eq("id", reportId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, report: updatedReport });
}
