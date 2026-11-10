import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // PM sees all tickets with system details, client profile, and dev profile
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("*, system_types(name), profiles:client_id(full_name, email), dev:assigned_dev_id(full_name, email)")
      .order("created_at", { ascending: false });

    // Fetch all developers to assign
    const { data: devs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "DEV");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ tickets: tickets || [], devs: devs || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PM tickets" }, { status: 500 });
  }
}

