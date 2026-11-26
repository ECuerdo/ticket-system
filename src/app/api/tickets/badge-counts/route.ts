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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ pmTickets: 0, devTickets: 0 });
    }

    // Fetch user profile for role and scope
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, assigned_system_type_id")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "CLIENT";
    let pmCount = 0;
    let devCount = 0;

    // PM or ADMIN needs PM tickets count (OPEN tickets awaiting triage)
    if (role === "PM" || role === "ADMIN") {
      let pmQuery = supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "OPEN");

      // For PM, filter to assigned systems if scoped
      if (role === "PM") {
        const { data: pmScopes } = await supabase
          .from("pm_system_scopes")
          .select("system_type_id")
          .eq("pm_id", user.id);

        const assignedSystemIds = (pmScopes || []).map((s) => s.system_type_id);
        if (assignedSystemIds.length === 0 && profile?.assigned_system_type_id) {
          assignedSystemIds.push(profile.assigned_system_type_id);
        }

        if (assignedSystemIds.length > 0) {
          pmQuery = pmQuery.in("system_type_id", assignedSystemIds);
        }
      }

      const { count } = await pmQuery;
      pmCount = count || 0;
    }

    // DEV or ADMIN needs Dev tickets count (CONFIRMED_BUG tickets awaiting dev work)
    if (role === "DEV" || role === "ADMIN") {
      let devQuery = supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "CONFIRMED_BUG");

      // For Dev, filter to tickets assigned to this dev
      if (role === "DEV") {
        devQuery = devQuery.eq("assigned_dev_id", user.id);
      }

      const { count } = await devQuery;
      devCount = count || 0;
    }

    return NextResponse.json({
      pmTickets: pmCount,
      devTickets: devCount,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load badge counts" },
      { status: 500 }
    );
  }
}
