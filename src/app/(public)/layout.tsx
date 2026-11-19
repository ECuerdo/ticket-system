import type { Metadata } from "next";
import { connection } from "next/server";
import { getAppSettings, buildThemeCss } from "@/lib/app-settings";
import { BrandingProvider } from "@/components/shared/branding-provider";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const settings = await getAppSettings();
  return {
    title: settings.sidebar_subtitle
      ? `${settings.project_name} | ${settings.sidebar_subtitle}`
      : settings.project_name,
    description: "High-performance ticket management system powered by Next.js and Supabase.",
    icons: { icon: settings.logo_url || "/favicon.ico" },
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const settings = await getAppSettings();

  return (
    <BrandingProvider value={settings}>
      <style
        dangerouslySetInnerHTML={{
          __html: buildThemeCss(settings.primary_color, settings.font_family, settings.font_size),
        }}
      />
      <div className="min-h-screen flex flex-col">{children}</div>
    </BrandingProvider>
  );
}
