"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Shield,
  Layers,
  Code2,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GroupChatSettings {
  pm_chat_enabled: boolean;
  dev_chat_enabled: boolean;
  staff_chat_enabled: boolean;
}

export function GroupChatsTab() {
  const [settings, setSettings] = useState<GroupChatSettings>({
    pm_chat_enabled: true,
    dev_chat_enabled: true,
    staff_chat_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/group-chats/settings");
      const json = await res.json();
      if (res.ok && json.settings) {
        setSettings({
          pm_chat_enabled: Boolean(json.settings.pm_chat_enabled),
          dev_chat_enabled: Boolean(json.settings.dev_chat_enabled),
          staff_chat_enabled: Boolean(json.settings.staff_chat_enabled),
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load group chat settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async (key: keyof GroupChatSettings, nextValue: boolean) => {
    setUpdatingKey(key);
    setStatusMessage(null);

    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: nextValue }));

    try {
      const res = await fetch("/api/group-chats/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextValue }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update setting");
      }

      setStatusMessage({
        type: "success",
        text: `Successfully ${nextValue ? "enabled" : "disabled"} ${
          key === "pm_chat_enabled"
            ? "PM Chat"
            : key === "dev_chat_enabled"
            ? "Dev Chat"
            : "Staff Chat"
        }.`,
      });
    } catch (err: any) {
      // Revert optimistic change
      setSettings((prev) => ({ ...prev, [key]: !nextValue }));
      setStatusMessage({ type: "error", text: err.message || "Failed to update chat room status." });
    } finally {
      setUpdatingKey(null);
    }
  };

  const chatModules = [
    {
      id: "pm_chat_enabled" as const,
      name: "PM Chat",
      href: "/pm-chat",
      icon: Layers,
      description: "Dedicated real-time communication channel exclusively for Project Managers and Administrators.",
      allowedRoles: ["PM", "ADMIN"],
      roleLabel: "PM & Admin",
      table: "pm_chat_messages",
      enabled: settings.pm_chat_enabled,
    },
    {
      id: "dev_chat_enabled" as const,
      name: "Dev Chat",
      href: "/dev-chat",
      icon: Code2,
      description: "Technical workspace and engineering discussion room for Developers and Administrators.",
      allowedRoles: ["DEV", "ADMIN"],
      roleLabel: "Dev & Admin",
      table: "dev_chat_messages",
      enabled: settings.dev_chat_enabled,
    },
    {
      id: "staff_chat_enabled" as const,
      name: "Staff Chat",
      href: "/staff-chat",
      icon: Users,
      description: "All-hands communication hub for cross-functional collaboration between PMs, Developers, and Admins.",
      allowedRoles: ["PM", "DEV", "ADMIN"],
      roleLabel: "PM, Dev & Admin",
      table: "staff_chat_messages",
      enabled: settings.staff_chat_enabled,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="p-5 md:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Group Chats Management</CardTitle>
                <CardDescription className="text-xs">
                  Configure access, status, and module availability for staff communication channels.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadSettings}
              disabled={loading}
              className="text-xs shrink-0 rounded-xl"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-5 md:px-6 pb-5 pt-0">
          <Alert className="rounded-xl border-border/60 bg-muted/30 py-3 text-xs">
            <Shield className="size-4 text-primary" />
            <AlertDescription className="text-muted-foreground leading-relaxed">
              When a chat module is <strong>Disabled</strong>, it becomes hidden from non-admin sidebars and messaging is paused. Each chat runs on an independent database table separate from ticket issues.
            </AlertDescription>
          </Alert>

          {statusMessage && (
            <Alert
              variant={statusMessage.type === "error" ? "destructive" : "default"}
              className={`mt-3 py-2.5 text-xs rounded-xl ${
                statusMessage.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                  : ""
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="size-4" />
              )}
              <AlertDescription>{statusMessage.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Grid of Chat Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chatModules.map((chat) => {
          const Icon = chat.icon;
          const isUpdating = updatingKey === chat.id;

          return (
            <Card
              key={chat.id}
              className={`rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                chat.enabled
                  ? "border-border/80 bg-card hover:border-primary/40"
                  : "border-border/50 bg-muted/20 opacity-80"
              }`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    chat.enabled
                      ? "bg-primary/10 border-primary/25 text-primary"
                      : "bg-muted border-border/60 text-muted-foreground"
                  }`}>
                    <Icon className="size-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {chat.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={chat.enabled}
                      disabled={isUpdating || loading}
                      onCheckedChange={(val) => handleToggle(chat.id, val)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">{chat.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono bg-muted/60">
                      {chat.roleLabel}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs leading-relaxed line-clamp-3">
                    {chat.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-5 py-2 space-y-2 text-xs">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">DB Storage:</span>
                  <span className="font-mono font-medium text-foreground">{chat.table}</span>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-3 border-t border-border/60 bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${chat.enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                  <span className="text-[11px] text-muted-foreground">
                    {chat.enabled ? "Active Channel" : "Inactive Channel"}
                  </span>
                </div>

                <Button
                  size="xs"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={chat.href} />}
                  className="text-xs rounded-lg gap-1.5"
                >
                  <span>Open Room</span>
                  <ExternalLink className="size-3" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
