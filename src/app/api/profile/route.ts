import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, birthdate, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      ...profile,
      email: user.email || profile?.email || "",
    },
  });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { full_name, birthdate, avatar_url } = body;

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (full_name !== undefined) {
    updates.full_name = typeof full_name === "string" ? full_name.trim() : "";
  }
  if (birthdate !== undefined) {
    updates.birthdate = birthdate || null;
  }
  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url || null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, email, full_name, role, avatar_url, birthdate, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    profile: {
      ...profile,
      email: user.email || profile?.email || "",
    },
  });
}
