import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/notifications";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { newPassword, confirmPassword } = body;

  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json({ error: "New password is required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters long" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation password do not match" },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notify Admins of password change
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const userName = profile?.full_name || user.email?.split("@")[0] || "User";

    await notifyAdmins({
      type: "PASSWORD_CHANGED",
      title: "Security: Password Changed",
      message: `${userName} (${user.email || ""}) updated their account password`,
      actorId: user.id,
      actorName: userName,
      actionUrl: `/admin-workplace?tab=users`,
      groupKey: `pwd-${user.id}`,
    });
  } catch (notifErr) {
    console.error("Failed to notify admins of password change:", notifErr);
  }

  return NextResponse.json({
    success: true,
    message: "Password updated successfully",
  });
}
