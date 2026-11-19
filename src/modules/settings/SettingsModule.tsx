"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Palette, Save, Trash2, Upload, Check, Type } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface SettingsModuleProps {
  initial: {
    project_name: string;
    logo_url: string | null;
    primary_color: string;
    sidebar_subtitle: string;
    landing_subtitle: string;
    font_family?: string;
    font_size?: string;
  };
}

const PRESET_COLORS = [
  { name: "Violet", value: "#5b2fd4" },
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Rose", value: "#e11d48" },
  { name: "Orange", value: "#ea580c" },
  { name: "Slate", value: "#334155" },
];

const FONT_STYLES = [
  { id: "geist", name: "Geist Sans (Clean Modern)", sample: "Aa Bb 123" },
  { id: "inter", name: "Inter (Classic System)", sample: "Aa Bb 123" },
  { id: "poppins", name: "Poppins (Geometric Friendly)", sample: "Aa Bb 123" },
  { id: "roboto", name: "Roboto (Neutral Clean)", sample: "Aa Bb 123" },
  { id: "serif", name: "Editorial Serif (Georgia)", sample: "Aa Bb 123" },
  { id: "mono", name: "Monospace (Tech / Code)", sample: "Aa Bb 123" },
];

const FONT_SIZES = [
  { id: "compact", name: "Compact", size: "14px", desc: "Best for high-density tables" },
  { id: "normal", name: "Default", size: "16px", desc: "Standard readable size" },
  { id: "comfortable", name: "Comfortable", size: "18px", desc: "Slightly enlarged for clarity" },
  { id: "large", name: "Large", size: "20px", desc: "Large accessible text" },
];

export default function SettingsModule({ initial }: SettingsModuleProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectName, setProjectName] = useState(initial.project_name);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logo_url);
  const [primaryColor, setPrimaryColor] = useState(initial.primary_color);
  const [subtitle, setSubtitle] = useState(initial.sidebar_subtitle);
  const [fontFamily, setFontFamily] = useState(initial.font_family || "geist");
  const [fontSize, setFontSize] = useState(initial.font_size || "normal");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidColor = /^#[0-9a-fA-F]{6}$/.test(primaryColor);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image file.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `branding/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !isValidColor) return;

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          logoUrl,
          primaryColor,
          sidebarSubtitle: subtitle,
          landingSubtitle: subtitle,
          fontFamily,
          fontSize,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings");

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize the project name, logo, and primary color used across the whole system.
        </p>
      </div>

      <form onSubmit={handleSave} className="w-full space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Branding Card */}
          <Card className="border-border/70 shadow-xs rounded-2xl flex flex-col justify-between">
            <div>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="size-4 text-primary" />
                  Branding
                </CardTitle>
                <CardDescription className="text-xs">
                  Project name and subtitle appear in the sidebar, landing page, and browser tab title.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name" className="text-xs">Project Name</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="e.g. TicketFlow"
                    maxLength={40}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subtitle" className="text-xs">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => {
                      setSubtitle(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="e.g. Issue Tracking"
                    maxLength={40}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Shown under the project name in the sidebar and on the public page.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Logo</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo preview" className="size-full object-contain" />
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5 mr-1.5" />
                        )}
                        {uploading ? "Uploading..." : "Upload Logo"}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setLogoUrl(null);
                            setSaved(false);
                          }}
                        >
                          <Trash2 className="size-3.5 mr-1.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Square PNG, SVG or JPG recommended.
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Primary Color Card */}
          <Card className="border-border/70 shadow-xs rounded-2xl flex flex-col justify-between">
            <div>
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="size-4 text-primary" />
                  Primary Color
                </CardTitle>
                <CardDescription className="text-xs">
                  Used for buttons, active menu items, links, and highlights in light and dark mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Preset Palettes</Label>
                  <div className="flex flex-wrap gap-2.5">
                    {PRESET_COLORS.map((c) => {
                      const active = primaryColor.toLowerCase() === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            setPrimaryColor(c.value);
                            setSaved(false);
                          }}
                          className={`flex size-9 items-center justify-center rounded-full border-2 transition-all ${
                            active ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.value }}
                        >
                          {active && <Check className="size-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs">Custom Hex</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      aria-label="Pick primary color"
                      value={isValidColor ? primaryColor : "#5b2fd4"}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setSaved(false);
                      }}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-input bg-background p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="#5b2fd4"
                      maxLength={7}
                      className="w-32 font-mono text-xs"
                    />
                    {!isValidColor && (
                      <span className="text-[11px] text-destructive">Use hex like #5b2fd4</span>
                    )}
                  </div>
                </div>

                {/* Typography Settings (Font Style & Font Size) */}
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5 font-semibold">
                      <Type className="size-3.5 text-primary" />
                      Font Style
                    </Label>
                    <select
                      value={fontFamily}
                      onChange={(e) => {
                        setFontFamily(e.target.value);
                        setSaved(false);
                      }}
                      className="h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs outline-none focus-visible:border-ring shadow-2xs font-medium"
                    >
                      {FONT_STYLES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Applied across the entire system UI and body text.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Base Font Size</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FONT_SIZES.map((s) => {
                        const isSelected = fontSize === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setFontSize(s.id);
                              setSaved(false);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-2xs text-primary"
                                : "border-border hover:bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <div className="text-xs font-bold leading-tight">{s.name}</div>
                            <div className="text-[10px] opacity-75">{s.size}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>

            <CardFooter className="border-t border-border/60 flex flex-wrap items-center gap-3 pt-4">
              <Button type="submit" size="sm" disabled={saving || uploading || !projectName.trim() || !isValidColor}>
                {saving ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="size-3.5 mr-1.5" />
                )}
                Save Settings
              </Button>
              {saved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="size-3.5" /> Saved and applied
                </span>
              )}
              {error && <span className="text-xs text-destructive">{error}</span>}
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
