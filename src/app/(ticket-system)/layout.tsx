import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppSettings, buildThemeCss } from "@/lib/app-settings";
import { BrandingProvider } from "@/components/shared/branding-provider";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AuthCacheGuard } from "@/components/shared/auth-cache-guard";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  const settings = await getAppSettings();
  return {
    title: settings.sidebar_subtitle
      ? `${settings.project_name} | ${settings.sidebar_subtitle}`
      : settings.project_name,
    icons: { icon: settings.logo_url || "/favicon.ico" },
  };
}

export default async function TicketSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const settings = await getAppSettings();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const headerUser = {
    id: user.id,
    name: userName,
    email: user.email || "",
    role: profile?.role || "CLIENT",
    avatar: profile?.avatar_url || "/avatars/shadcn.jpg",
  };

  return (
    <BrandingProvider value={settings}>
      <AuthCacheGuard />
      <style
        dangerouslySetInnerHTML={{
          __html: buildThemeCss(settings.primary_color, settings.font_family, settings.font_size),
        }}
      />
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <AppSidebar user={headerUser} />
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            {children}
          </div>
        </div>
      </SidebarProvider>
    </BrandingProvider>
  );
}
