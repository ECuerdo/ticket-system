import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings, isValidHex } from "@/lib/app-settings";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const projectName = String(body.projectName ?? "").trim();
    const primaryColor = String(body.primaryColor ?? "").trim();
    const logoUrl = body.logoUrl ? String(body.logoUrl) : null;
    const sidebarSubtitle = String(body.sidebarSubtitle ?? "").trim().slice(0, 40);
    const landingSubtitle = String(body.landingSubtitle ?? "").trim().slice(0, 40);
    const fontFamily = String(body.fontFamily ?? "geist").trim();
    const fontSize = String(body.fontSize ?? "normal").trim();

    if (!projectName) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }
    if (!isValidHex(primaryColor)) {
      return NextResponse.json({ error: "Invalid color. Use a hex value like #5b2fd4" }, { status: 400 });
    }

    const { error } = await supabase
      .from("app_settings")
      .update({
        project_name: projectName,
        logo_url: logoUrl,
        primary_color: primaryColor,
        sidebar_subtitle: sidebarSubtitle,
        landing_subtitle: landingSubtitle,
        font_family: fontFamily,
        font_size: fontSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
