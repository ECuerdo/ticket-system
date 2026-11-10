import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("*, system_types(name), profiles:client_id(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ tickets: tickets || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

