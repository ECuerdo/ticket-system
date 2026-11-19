"use client";

import { createContext, useContext } from "react";

export interface Branding {
  project_name: string;
  logo_url: string | null;
  primary_color: string;
  sidebar_subtitle: string;
  landing_subtitle: string;
  font_family?: string;
  font_size?: string;
}

const BrandingContext = createContext<Branding>({
  project_name: "TicketFlow",
  logo_url: null,
  primary_color: "#5b2fd4",
  sidebar_subtitle: "Issue Tracking",
  landing_subtitle: "Supabase Edition",
  font_family: "geist",
  font_size: "normal",
});

export function BrandingProvider({
  value,
  children,
}: {
  value: Branding;
  children: React.ReactNode;
}) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

/** Renders the sidebar ("sidebar") or landing page ("landing") subtitle. */
export function BrandSubtitle({ variant }: { variant: "sidebar" | "landing" }) {
  const b = useBranding();
  return <>{variant === "sidebar" ? b.sidebar_subtitle : b.landing_subtitle}</>;
}

/** Renders the configured project name (usable inside server-rendered headers). */
export function ProjectName() {
  return <>{useBranding().project_name}</>;
}

/**
 * Renders the configured logo. With a logo: image only (no background).
 * Without: the fallback icon inside a primary-colored badge.
 */
export function BrandLogo({
  className = "size-9 rounded-xl",
  fallback,
}: {
  className?: string;
  fallback: React.ReactNode;
}) {
  const { logo_url, project_name } = useBranding();
  if (logo_url) {
    return (
      <div className={`flex items-center justify-center overflow-hidden ${className}`}>
        <img src={logo_url} alt={project_name} className="size-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-primary text-primary-foreground shadow-sm ${className}`}
    >
      {fallback}
    </div>
  );
}
