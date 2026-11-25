import { NextResponse, type NextRequest } from "next/server";
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

    // Get current user's profile to check role and assigned category/system
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, assigned_system_type_id")
      .eq("id", user.id)
      .single();

    // Fetch this PM's multiple assigned system scopes
    const { data: pmScopes } = await supabase
      .from("pm_system_scopes")
      .select("system_type_id")
      .eq("pm_id", user.id);

    const assignedSystemIds = (pmScopes || []).map((s) => s.system_type_id);
    if (assignedSystemIds.length === 0 && profile?.assigned_system_type_id) {
      assignedSystemIds.push(profile.assigned_system_type_id);
    }

    let query = supabase
      .from("tickets")
      .select(
        "*, system_types(name), profiles:client_id(full_name, email), dev:assigned_dev_id(full_name, email)"
      )
      .order("created_at", { ascending: false });

    // If user is PM and has assigned system scopes, filter tickets strictly to those categories
    if (profile?.role === "PM" && assignedSystemIds.length > 0) {
      query = query.in("system_type_id", assignedSystemIds);
    }

    const { data: tickets, error } = await query;

    // Fetch this PM's saved developers
    const { data: pmDevsData } = await supabase
      .from("pm_developers")
      .select("id, dev_id, created_at, dev:dev_id(id, full_name, email, role)")
      .eq("pm_id", user.id);

    const myDevelopers = (pmDevsData || [])
      .map((entry: any) => entry.dev)
      .filter(Boolean);

    // Fetch all available developers in the company (users with role DEV)
    const { data: allDevs } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "DEV");

    // Fetch all active system types with their choices for transfer
    const { data: systemsData } = await supabase
      .from("system_types")
      .select("id, name, description, active, system_choices(id, label, description, active)")
      .eq("active", true)
      .order("name", { ascending: true });

    // Fetch global categories where system_type_id IS NULL
    const { data: globalChoices } = await supabase
      .from("system_choices")
      .select("id, label, description, active")
      .is("system_type_id", null)
      .eq("active", true)
      .order("created_at", { ascending: true });

    const enrichedSystems = (systemsData || []).map((s: any) => {
      const systemSpecific = (s.system_choices || []).filter((c: any) => c.active !== false);
      const activeGlobals = (globalChoices || []).filter((c: any) => c.active !== false);
      return {
        ...s,
        system_choices: [...activeGlobals, ...systemSpecific],
      };
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      tickets: tickets || [],
      myDevelopers: myDevelopers || [],
      allDevelopers: allDevs || [],
      // For backwards compatibility or fallback if PM hasn't assigned specific devs yet:
      devs: myDevelopers.length > 0 ? myDevelopers : (allDevs || []),
      assignedSystemId: assignedSystemIds[0] || profile?.assigned_system_type_id || null,
      assignedSystemIds: assignedSystemIds,
      systems: enrichedSystems || [],
      userRole: profile?.role || "PM",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PM tickets" }, { status: 500 });
  }
}

// POST: Add developer to My Developers
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { devId } = await request.json();
    if (!devId) {
      return NextResponse.json({ error: "Developer ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pm_developers")
      .insert({
        pm_id: user.id,
        dev_id: devId,
      })
      .select("id, dev:dev_id(id, full_name, email)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Developer is already added to your team." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove developer from My Developers
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { devId } = await request.json();
    if (!devId) {
      return NextResponse.json({ error: "Developer ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("pm_developers")
      .delete()
      .eq("pm_id", user.id)
      .eq("dev_id", devId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
