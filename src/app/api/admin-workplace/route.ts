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

    // Fetch multi-system scopes for PMs
    const { data: pmScopes } = await supabase
      .from("pm_system_scopes")
      .select("pm_id, system_type_id, system_type:system_types(id, name)");

    const scopesByPm: Record<string, { id: string; name: string }[]> = {};
    if (pmScopes) {
      for (const scope of pmScopes) {
        if (!scopesByPm[scope.pm_id]) scopesByPm[scope.pm_id] = [];
        if (scope.system_type) {
          scopesByPm[scope.pm_id].push({
            id: (scope.system_type as any).id,
            name: (scope.system_type as any).name,
          });
        }
      }
    }

    const enrichedUsers = (users || []).map((u) => {
      const pmAssigned = scopesByPm[u.id] || [];
      // Fallback to legacy assigned_system if not in pm_system_scopes yet
      const finalSystems =
        pmAssigned.length > 0
          ? pmAssigned
          : u.assigned_system
          ? [u.assigned_system]
          : [];
      return {
        ...u,
        assigned_systems: finalSystems,
        assigned_system_ids: finalSystems.map((s: any) => s.id),
      };
    });

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
      users: enrichedUsers || [],
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

// PATCH: update user role, assigned system/category, or system type
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

    const body = await request.json();
    const {
      type,
      systemId,
      userId,
      role,
      assignedSystemTypeId,
      assignedSystemTypeIds,
      name,
      description,
      active,
    } = body;

    // 1. Update System Type
    if (type === "system" || systemId) {
      const targetSysId = systemId || body.id;
      if (!targetSysId) {
        return NextResponse.json({ error: "System ID is required" }, { status: 400 });
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (active !== undefined) updateData.active = Boolean(active);

      const { data: updatedSystem, error: sysUpdateError } = await supabase
        .from("system_types")
        .update(updateData)
        .eq("id", targetSysId)
        .select()
        .single();

      if (sysUpdateError) {
        return NextResponse.json({ error: sysUpdateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, system: updatedSystem });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID or System ID is required" }, { status: 400 });
    }

    // Handle multi-system scopes for PM (assignedSystemTypeIds array)
    if (assignedSystemTypeIds !== undefined && Array.isArray(assignedSystemTypeIds)) {
      // 1. Delete existing scopes for this PM
      await supabase.from("pm_system_scopes").delete().eq("pm_id", userId);

      // 2. Insert selected system scopes
      if (assignedSystemTypeIds.length > 0) {
        const rowsToInsert = assignedSystemTypeIds.map((stId: string) => ({
          pm_id: userId,
          system_type_id: stId,
        }));
        await supabase.from("pm_system_scopes").insert(rowsToInsert);
      }

      // 3. Keep profiles.assigned_system_type_id synced with first element for compatibility
      const fallbackId = assignedSystemTypeIds[0] || null;
      await supabase.rpc("admin_update_profile", {
        target_user_id: userId,
        new_role: role || null,
        new_assigned_system_type_id: fallbackId,
        update_system_type: true,
      });

      return NextResponse.json({ success: true, assignedSystemTypeIds });
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

// DELETE: remove system type or choices
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    let type = searchParams.get("type") || "system";

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id || body.systemId;
      if (body.type) type = body.type;
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (type === "system") {
      // 1. Check if tickets exist referencing this system
      const { count: ticketCount, error: countError } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("system_type_id", id);

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }

      if (ticketCount && ticketCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete this system type because ${ticketCount} ticket(s) are associated with it. Please deactivate it instead so it is hidden from new ticket reports while preserving existing records.`,
          },
          { status: 400 }
        );
      }

      // 2. Unassign from any PM profiles
      await supabase
        .from("profiles")
        .update({ assigned_system_type_id: null })
        .eq("assigned_system_type_id", id);

      // 3. Delete system choices
      await supabase
        .from("system_choices")
        .delete()
        .eq("system_type_id", id);

      // 4. Delete the system type
      const { error: delError } = await supabase
        .from("system_types")
        .delete()
        .eq("id", id);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "System type deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
