import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: systems } = await supabase
      .from("system_types")
      .select("*, system_choices(*)")
      .order("created_at", { ascending: false });

    const { data: users } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      systems: systems || [],
      users: users || [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}

