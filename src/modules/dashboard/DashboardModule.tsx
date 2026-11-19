"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle,
  PlusCircle,
  Users,
  Code2,
  Kanban,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "./types";

export default function DashboardModule({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (!ignore) {
          setData(json);
        }
      } catch {
        console.error("Failed to load dashboard data");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  const role = data?.role || "CLIENT";

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    switch (priority) {
      case "URGENT":
        return (
          <Badge variant="outline" className="border-red-400/40 text-red-500 bg-red-50 dark:bg-red-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Urgent
          </Badge>
        );
      case "HIGH":
        return (
          <Badge variant="outline" className="border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            High
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge variant="outline" className="border-blue-400/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Medium
          </Badge>
        );
      case "LOW":
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium text-muted-foreground">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <Badge variant="outline" className="border-blue-400/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Open
          </Badge>
        );
      case "CONFIRMED_BUG":
        return (
          <Badge variant="outline" className="border-purple-400/40 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Confirmed Bug
          </Badge>
        );
      case "IN_DEVELOPMENT":
        return (
          <Badge variant="outline" className="border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            In Dev
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge variant="outline" className="border-emerald-400/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Resolved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium">
            {status}
          </Badge>
        );
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-primary text-primary-foreground font-mono text-[10px]">ADMIN</Badge>;
      case "PM":
        return <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-mono text-[10px]">PROJECT MANAGER</Badge>;
      case "DEV":
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-mono text-[10px]">DEVELOPER</Badge>;
      default:
        return <Badge variant="secondary" className="font-mono text-[10px]">CLIENT</Badge>;
    }
  };

  const getSubheading = () => {
    switch (role) {
      case "ADMIN":
        return "Complete organization-wide platform overview, registered accounts, and systems status.";
      case "PM":
        return data?.scopeSystemName
          ? `Triage backlog, assigned developers, and status for category: ${data.scopeSystemName}.`
          : "Triage backlog, assigned developers, and tickets across all categories.";
      case "DEV":
        return "Overview of bugs and technical tickets assigned to your engineering queue.";
      default:
        return "Track your submitted issue reports, resolutions, and support requests.";
    }
  };

  const getPrimaryAction = () => {
    switch (role) {
      case "ADMIN":
        return (
          <Button nativeButton={false} className="rounded-2xl shadow-md shadow-primary/20" render={<Link href="/admin-workplace" />}>
            <ShieldCheck className="size-4 mr-2" />
            Admin Workplace
          </Button>
        );
      case "PM":
        return (
          <Button nativeButton={false} className="rounded-2xl shadow-md shadow-primary/20" render={<Link href="/pm-workplace" />}>
            <Kanban className="size-4 mr-2" />
            PM Workplace
          </Button>
        );
      case "DEV":
        return (
          <Button nativeButton={false} className="rounded-2xl shadow-md shadow-primary/20" render={<Link href="/dev-workplace" />}>
            <Code2 className="size-4 mr-2" />
            Dev Workplace
          </Button>
        );
      default:
        return (
          <Button nativeButton={false} className="rounded-2xl shadow-md shadow-primary/20" render={<Link href="/create-ticket" />}>
            <PlusCircle className="size-4 mr-2" />
            Create Ticket
          </Button>
        );
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Welcome banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {userName}!</h1>
            {getRoleBadge()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getSubheading()}
          </p>
        </div>
        <div>
          {getPrimaryAction()}
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {role === "ADMIN" && (
          <>
            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Ticket className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Total Tickets</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.totalTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">All systems combined</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Pending Triage</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.openTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Waiting for PM review</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-purple-200/70 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                <Users className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-purple-700 dark:text-purple-400">Total Users</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.totalUsers ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Active platform accounts</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <Layers className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">System Types</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.totalSystems ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Configured platforms</div>
              </div>
            </div>
          </>
        )}

        {role === "PM" && (
          <>
            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Ticket className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Scope Tickets</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.totalTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">{data?.scopeSystemName || "All Systems"}</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Needs Verification</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.openTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Unconfirmed issues</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Clock className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Active In Dev</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.inProgressTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Bugs being resolved</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-purple-200/70 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                <Code2 className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-purple-700 dark:text-purple-400">My Dev Team</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.myDevelopersCount ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Assigned engineers</div>
              </div>
            </div>
          </>
        )}

        {role === "DEV" && (
          <>
            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Ticket className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Assigned to Me</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.totalTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Total assigned bugs</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <span className="font-mono text-sm font-bold">&lt;/&gt;</span>
              </div>
              <div>
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">In Development</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.inProgressTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Active work in progress</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-red-200/70 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-500">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-red-600 dark:text-red-400">Urgent Issues</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.urgentTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">High priority blockers</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Resolved by Me</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.resolvedTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Completed & closed</div>
              </div>
            </div>
          </>
        )}

        {role === "CLIENT" && (
          <>
            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Ticket className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">My Tickets</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.totalTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Total reports filed</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Open</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.openTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Awaiting review</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Clock className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">In Progress</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.inProgressTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Being fixed by dev team</div>
              </div>
            </div>

            <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Resolved</div>
                <div className="text-xl font-bold text-foreground">{loading ? "..." : data?.resolvedTickets ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">Successfully closed</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity Table */}
      <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <div>
            <CardTitle className="text-base font-semibold">
              {role === "CLIENT"
                ? "My Recent Tickets"
                : role === "DEV"
                ? "My Assigned Tasks"
                : role === "PM"
                ? "Recent Backlog Activity"
                : "Recent System Activity"}
            </CardTitle>
            <CardDescription className="text-xs">
              {role === "CLIENT"
                ? "Latest issues reported by your account"
                : role === "DEV"
                ? "Recent bugs assigned to you"
                : role === "PM"
                ? "Recent tickets under your triage jurisdiction"
                : "Latest tickets logged across all platforms"}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={
                  role === "DEV"
                    ? "/dev-workplace"
                    : role === "PM"
                    ? "/pm-workplace"
                    : "/tickets"
                }
              />
            }
          >
            View All <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Loading tickets...</p>
          ) : !data?.recentTickets || data.recentTickets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <LifeBuoy className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets found in this queue.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.recentTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{t.ticket_number}</span>
                      <span className="font-semibold text-sm line-clamp-1 text-foreground">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers className="size-3" />
                      <span>{t.system_types?.name || "General"}</span>
                      <span>&bull;</span>
                      <span>by {t.profiles?.full_name || "Client"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(t.priority)}
                    {getStatusBadge(t.status)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

