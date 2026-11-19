import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  try {
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

    const { data: systems, error: sysErr } = await supabase
      .from("system_types")
      .select("*, system_choices(*)")
      .eq("active", true)
      .order("name", { ascending: true });

    // Fetch global categories (system_type_id IS NULL)
    const { data: globalChoices, error: choiceErr } = await supabase
      .from("system_choices")
      .select("*")
      .is("system_type_id", null)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (sysErr) {
      return NextResponse.json({ error: sysErr.message }, { status: 400 });
    }
    if (choiceErr) {
      return NextResponse.json({ error: choiceErr.message }, { status: 400 });
    }

    // Merge global choices into each system so they are always available
    const enrichedSystems = (systems || []).map((s) => {
      const systemSpecific = s.system_choices || [];
      const combined = [...(globalChoices || []), ...systemSpecific];
      return {
        ...s,
        system_choices: combined,
      };
    });

    return NextResponse.json({
      systems: enrichedSystems,
      globalChoices: globalChoices || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch systems" },
      { status: 500 }
    );
  }
}
