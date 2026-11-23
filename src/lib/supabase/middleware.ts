import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/create-ticket") ||
    pathname.startsWith("/admin-workplace") ||
    pathname.startsWith("/pm-workplace") ||
    pathname.startsWith("/dev-workplace") ||
    pathname.startsWith("/hall-of-fame") ||
    pathname.startsWith("/hall-of-shame") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  // If not logged in and attempting to access any protected route, redirect to /?auth=login
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?auth=login";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    redirectResponse.headers.set("Pragma", "no-cache");
    return redirectResponse;
  }

  // If already logged in and visiting /login or /?auth=login, redirect to /dashboard
  if (user && (pathname === "/login" || (pathname === "/" && request.nextUrl.searchParams.get("auth")))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Prevent back-forward cache (bfcache) on protected routes
  if (isProtectedPath) {
    supabaseResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    supabaseResponse.headers.set("Pragma", "no-cache");
  }

  return supabaseResponse;
}
