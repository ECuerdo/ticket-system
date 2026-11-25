import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface AppSettings {
  project_name: string;
  logo_url: string | null;
  primary_color: string;
  sidebar_subtitle: string;
  landing_subtitle: string;
  font_family: string;
  font_size: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  project_name: "TicketFlow",
  logo_url: null,
  primary_color: "#5b2fd4",
  sidebar_subtitle: "Issue Tracking",
  landing_subtitle: "Supabase Edition",
  font_family: "geist",
  font_size: "normal",
};

export const FONT_STYLE_MAP: Record<string, string> = {
  geist: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  poppins: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  roboto: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

export const FONT_SIZE_MAP: Record<string, { root: string; label: string }> = {
  compact: { root: "14px", label: "Compact (14px)" },
  normal: { root: "16px", label: "Default (16px)" },
  comfortable: { root: "18px", label: "Comfortable (18px)" },
  large: { root: "20px", label: "Large (20px)" },
};

export function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Returns a readable foreground (white/near-black) for a hex background. */
export function getContrastForeground(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#111111" : "#ffffff";
}

/** CSS that overrides primary-related design tokens, font family, and font size. */
export function buildThemeCss(
  hex: string,
  fontFamilyKey: string = "geist",
  fontSizeKey: string = "normal"
) {
  const fg = getContrastForeground(hex);
  const fontFamilyCss = FONT_STYLE_MAP[fontFamilyKey] || FONT_STYLE_MAP.geist;
  const fontSizeCss = FONT_SIZE_MAP[fontSizeKey]?.root || FONT_SIZE_MAP.normal.root;

  return `
html:root {
  font-size: ${fontSizeCss};
  --primary: ${hex};
  --primary-foreground: ${fg};
  --ring: ${hex};
  --accent: color-mix(in oklch, ${hex} 10%, white);
  --accent-foreground: color-mix(in oklch, ${hex} 85%, black);
  --secondary-foreground: color-mix(in oklch, ${hex} 85%, black);
  --sidebar-primary: ${hex};
  --sidebar-primary-foreground: ${fg};
  --sidebar-accent: color-mix(in oklch, ${hex} 10%, white);
  --sidebar-accent-foreground: color-mix(in oklch, ${hex} 85%, black);
  --sidebar-ring: ${hex};
  --chart-1: ${hex};
}
html, body, button, input, textarea, select {
  font-family: ${fontFamilyCss} !important;
}
html.dark {
  --primary: color-mix(in oklch, ${hex} 78%, white);
  --primary-foreground: #0b0b0f;
  --ring: color-mix(in oklch, ${hex} 78%, white);
  --accent: color-mix(in oklch, ${hex} 22%, black);
  --accent-foreground: #f5f5f7;
  --secondary-foreground: #f5f5f7;
  --sidebar-primary: color-mix(in oklch, ${hex} 78%, white);
  --sidebar-primary-foreground: #0b0b0f;
  --sidebar-accent: color-mix(in oklch, ${hex} 22%, black);
  --sidebar-accent-foreground: #f5f5f7;
  --sidebar-ring: color-mix(in oklch, ${hex} 78%, white);
  --chart-1: color-mix(in oklch, ${hex} 78%, white);
}`;
}

export async function getAppSettings(): Promise<AppSettings> {
  "use cache";
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("app_settings")
      .select(
        "project_name, logo_url, primary_color, sidebar_subtitle, landing_subtitle, font_family, font_size"
      )
      .eq("id", 1)
      .single();

    if (!data) return DEFAULT_SETTINGS;
    return {
      project_name: data.project_name || DEFAULT_SETTINGS.project_name,
      logo_url: data.logo_url || null,
      primary_color: isValidHex(data.primary_color) ? data.primary_color : DEFAULT_SETTINGS.primary_color,
      sidebar_subtitle: data.sidebar_subtitle ?? DEFAULT_SETTINGS.sidebar_subtitle,
      landing_subtitle: data.landing_subtitle ?? DEFAULT_SETTINGS.landing_subtitle,
      font_family: data.font_family || DEFAULT_SETTINGS.font_family,
      font_size: data.font_size || DEFAULT_SETTINGS.font_size,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
