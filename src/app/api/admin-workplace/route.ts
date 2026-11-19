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

    const { data: systems, error: sysError } = await supabase
      .from("system_types")
      .select("*, system_choices(*)")
      .order("created_at", { ascending: false });

    // Fetch global categories where system_type_id IS NULL
    const { data: globalChoices } = await supabase
      .from("system_choices")
      .select("*")
      .is("system_type_id", null)
      .order("created_at", { ascending: true });

    const { data: users, error: usrError } = await supabase
      .from("profiles")
      .select("*, assigned_system:assigned_system_type_id(id, name)")
      .order("created_at", { ascending: false });

    if (sysError || usrError) {
      return NextResponse.json(
        { error: sysError?.message || usrError?.message },
        { status: 400 }
      );
    }

    // Combine global choices into systems for admin views
    const enrichedSystems = (systems || []).map((s) => ({
      ...s,
      system_choices: [...(globalChoices || []), ...(s.system_choices || [])],
    }));

    return NextResponse.json({
      systems: enrichedSystems || [],
      globalChoices: globalChoices || [],
      users: users || [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}

// POST: create system type or choice, or admin reset password
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is ADMIN
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { type } = body;

    // Reset user password
    if (type === "reset-password") {
      const { targetUserId, newPassword } = body;
      if (!targetUserId || !newPassword) {
        return NextResponse.json(
          { error: "User ID and new password are required" },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const { error: resetError } = await supabase.rpc("admin_reset_user_password", {
        target_user_id: targetUserId,
        new_plain_password: newPassword,
      });

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    if (type === "system") {
      const { name, description } = body;
      if (!name) {
        return NextResponse.json({ error: "System name is required" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("system_types")
        .insert({ name, description })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, system: data });
    }

    if (type === "choice") {
      const { systemTypeId, category, label, value, isGlobal } = body;
      if (!label) {
        return NextResponse.json(
          { error: "Category label is required" },
          { status: 400 }
        );
      }

      const targetSysId = isGlobal || systemTypeId === "ALL" || !systemTypeId ? null : systemTypeId;

      const { data, error } = await supabase
        .from("system_choices")
        .insert({
          system_type_id: targetSysId,
          category: category || "General",
          label,
          value: value || label.toLowerCase().replace(/\s+/g, "-"),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, choice: data });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: update user role or assigned system/category
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is ADMIN
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { userId, role, assignedSystemTypeId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Call security definer function admin_update_profile
    const { data, error } = await supabase.rpc("admin_update_profile", {
      target_user_id: userId,
      new_role: role || null,
      new_assigned_system_type_id: assignedSystemTypeId || null,
      update_system_type: assignedSystemTypeId !== undefined,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const updatedUser = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ success: true, user: updatedUser });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
