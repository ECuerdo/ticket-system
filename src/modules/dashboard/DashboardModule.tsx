"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {userName}!</h1>
          <p className="text-sm text-muted-foreground">
            Overview of current ticket pipeline, triage backlog, and system activities.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/create-ticket" />}>
          <PlusCircle className="size-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Total Tickets</CardDescription>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : data?.totalTickets ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Across all connected systems</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Open / Pending Triage</CardDescription>
            <AlertCircle className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {loading ? "..." : data?.openTickets ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Waiting for PM review</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">In Development</CardDescription>
            <Clock className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {loading ? "..." : data?.inProgressTickets ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Assigned to engineers</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Resolved Issues</CardDescription>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : data?.resolvedTickets ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Successfully deployed & verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Recent Ticket Activity</CardTitle>
            <CardDescription className="text-xs">
              Latest tickets logged into the platform
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tickets" />}>
            View All <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Loading tickets...</p>
          ) : !data?.recentTickets || data.recentTickets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <LifeBuoy className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.recentTickets.map((t) => (
                <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{t.ticket_number}</span>
                      <span className="font-semibold text-sm line-clamp-1">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers className="size-3" />
                      <span>{t.system_types?.name}</span>
                      <span>&bull;</span>
                      <span>by {t.profiles?.full_name || "Client"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {t.priority}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

