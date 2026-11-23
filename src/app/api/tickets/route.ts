import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "ADMIN";

    let query = supabase
      .from("tickets")
      .select("*, system_types(name), profiles:client_id(full_name, email)")
      .order("created_at", { ascending: false });

    // If not ADMIN, only return tickets created by the logged-in user
    if (!isAdmin) {
      query = query.eq("client_id", user.id);
    }

    const { data: tickets, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Expose is_human_error only to internal roles (ADMIN, PM, DEV)
    const isStaff = isAdmin || profile?.role === "PM" || profile?.role === "DEV";
    const clientSafeTickets = (tickets || []).map((t: any) => {
      if (isStaff) {
        return t;
      }
      const { is_human_error: _excluded, ...rest } = t;
      return rest;
    });

    return NextResponse.json({ tickets: clientSafeTickets, isAdmin });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

