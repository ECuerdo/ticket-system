import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name, assigned_system_type_id, assigned_system:assigned_system_type_id(name)")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || "CLIENT";

    let query = supabase
      .from("tickets")
      .select("*, system_types(name), profiles:client_id(full_name, email)");

    // Adapt ticket pool based on user role:
    if (userRole === "CLIENT") {
      // Client sees only their own tickets
      query = query.eq("client_id", user.id);
    } else if (userRole === "DEV") {
      // Developer sees tickets assigned to them
      query = query.eq("assigned_dev_id", user.id);
    } else if (userRole === "PM") {
      // Project Manager sees tickets for their assigned system category, or all if assigned to all
      if (profile?.assigned_system_type_id) {
        query = query.eq("system_type_id", profile.assigned_system_type_id);
      }
    }
    // ADMIN sees all tickets across all systems

    const { data: tickets, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const all = tickets || [];

    // Additional role-specific metric counts
    let extraStats: Record<string, any> = {};

    if (userRole === "ADMIN") {
      const [{ count: userCount }, { count: systemCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("system_types").select("*", { count: "exact", head: true }),
      ]);
      extraStats = {
        totalUsers: userCount || 0,
        totalSystems: systemCount || 0,
      };
    } else if (userRole === "PM") {
      const { count: devCount } = await supabase
        .from("pm_developers")
        .select("*", { count: "exact", head: true })
        .eq("pm_id", user.id);
      extraStats = {
        myDevelopersCount: devCount || 0,
        scopeSystemName: (profile as any)?.assigned_system?.name || "All Systems",
      };
    }

    const stats = {
      role: userRole,
      scopeSystemName: (profile as any)?.assigned_system?.name || null,
      totalTickets: all.length,
      openTickets: all.filter((t) => t.status === "OPEN").length,
      inProgressTickets: all.filter((t) => ["CONFIRMED_BUG", "IN_DEVELOPMENT"].includes(t.status)).length,
      resolvedTickets: all.filter((t) => t.status === "RESOLVED").length,
      urgentTickets: all.filter((t) => t.priority === "URGENT").length,
      recentTickets: all.slice(0, 5),
      ...extraStats,
    };

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

