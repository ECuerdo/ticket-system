import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { notifyAdmins } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role || "CLIENT",
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Notify Admins of New Registered User
    try {
      await notifyAdmins({
        type: "USER_REGISTERED",
        title: "New User Registered",
        message: `${fullName} (${email}) registered as ${role || "CLIENT"}`,
        actorId: data.user?.id,
        actorName: fullName,
        actionUrl: `/admin-workplace?tab=users`,
        groupKey: `user-reg-${data.user?.id || email}`,
      });
    } catch (notifErr) {
      console.error("Failed to notify admins of registration:", notifErr);
    }

    return NextResponse.json(
      { success: true, session: data.session, user: data.user, redirectPath: "/dashboard" },
      { headers: response.headers }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}

