import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
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

  try {
    await supabase.auth.signOut();
  } catch {
    // Continue even if signOut errors
  }

  // Explicitly invalidate all Supabase auth cookies and remember_me cookie
  response.cookies.set({
    name: "remember_me",
    value: "",
    maxAge: 0,
    path: "/",
  });

  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
      response.cookies.set({
        name: cookie.name,
        value: "",
        maxAge: 0,
        path: "/",
      });
    }
  }

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");

  return response;
}
