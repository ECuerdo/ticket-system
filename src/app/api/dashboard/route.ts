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

    const all = tickets || [];
    const stats = {
      totalTickets: all.length,
      openTickets: all.filter((t) => t.status === "OPEN").length,
      inProgressTickets: all.filter((t) => ["CONFIRMED_BUG", "IN_DEVELOPMENT"].includes(t.status)).length,
      resolvedTickets: all.filter((t) => t.status === "RESOLVED").length,
      recentTickets: all.slice(0, 5),
    };

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

