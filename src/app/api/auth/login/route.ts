import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const shouldRemember = Boolean(rememberMe);
    const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
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
              const cookieOptions = {
                ...options,
                ...(shouldRemember ? { maxAge: ONE_YEAR_SECONDS } : {}),
              };
              response.cookies.set(name, value, cookieOptions);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (shouldRemember) {
      response.cookies.set("remember_me", "true", {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } else {
      response.cookies.set("remember_me", "", {
        path: "/",
        maxAge: 0,
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role || "CLIENT";

    return NextResponse.json(
      { success: true, redirectPath: "/dashboard", role },
      {
        headers: response.headers,
      }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
