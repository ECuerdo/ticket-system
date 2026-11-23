"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Flame,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  RefreshCw,
  AlertOctagon,
  Calendar,
  Hourglass,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type TimeRange = "this_week" | "last_week" | "this_month" | "all_time";

interface CategoryStat {
  id: string;
  name: string;
  description?: string;
  ticketVolume: number;
  respondedCount: number;
  unrespondedCount: number;
  avgResponseMinutes: number | null;
  unresolvedCount: number;
  avgResolutionHours: number | null;
}

interface PmStat {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  assignedCategory: string;
  ticketVolume: number;
  respondedCount: number;
  unrespondedCount: number;
  avgResponseMinutes: number | null;
  unresolvedCount: number;
  avgResolutionHours: number | null;
}

interface HallOfShameData {
  timeRange: TimeRange;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalTickets: number;
    unresolvedTickets: number;
    totalCategories: number;
    totalPms: number;
  };
  categories: {
    stats: CategoryStat[];
    rankings: {
      slowestResponse: CategoryStat[];
      highestVolume: CategoryStat[];
      slowestResolution: CategoryStat[];
    };
  };
  pms: {
    stats: PmStat[];
    rankings: {
      slowestResponse: PmStat[];
      highestVolume: PmStat[];
      slowestResolution: PmStat[];
    };
  };
}

export default function HallOfShameModule() {
  const [timeRange, setTimeRange] = useState<TimeRange>("this_week");
  const [data, setData] = useState<HallOfShameData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (range: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hall-of-shame?timeRange=${range}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load Hall of Shame reports");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeRange);
  }, [timeRange]);

  const formatMinutes = (minutes: number | null): string => {
    if (minutes === null || minutes === undefined) return "No data";
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  };

  const formatHours = (hours: number | null): string => {
    if (hours === null || hours === undefined) return "No data";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  // Shame Rank Badge Helper
  const renderShameRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs">
          🚨 #1 Highest Lag
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 shadow-xs">
          ⚠️ #2 Lagging
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
          ⚠️ #3 At Risk
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center size-6 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
        #{index + 1}
      </span>
    );
  };

  // Shame Champions (Top bottlenecks)
  const categoryBottlenecks = useMemo(() => {
    if (!data) return { response: null, volume: null, resolution: null };
    return {
      response: data.categories.rankings.slowestResponse[0] || null,
      volume: data.categories.rankings.highestVolume[0] || null,
      resolution: data.categories.rankings.slowestResolution[0] || null,
    };
  }, [data]);

  const pmBottlenecks = useMemo(() => {
    if (!data) return { response: null, volume: null, resolution: null };
    return {
      response: data.pms.rankings.slowestResponse[0] || null,
      volume: data.pms.rankings.highestVolume[0] || null,
      resolution: data.pms.rankings.slowestResolution[0] || null,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs">
              <Flame className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading flex items-center gap-2">
                Hall of Shame
                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  Accountability
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Bottleneck audit identifying Slowest Response, Heavy Bug Loads, and Prolonged Resolution times.
              </p>
            </div>
          </div>
        </div>

        {/* Time Filter & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setTimeRange("this_week")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === "this_week"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("last_week")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === "last_week"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last Week
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("this_month")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === "this_month"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("all_time")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeRange === "all_time"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Time
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData(timeRange)}
            disabled={loading}
            className="size-9 rounded-xl border-border/60 hover:bg-muted"
            title="Refresh metrics"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-rose-500" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-center gap-3">
          <AlertOctagon className="size-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse border border-border/50" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Top Bottleneck Spotlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Slowest Response Spotlight */}
            <Card className="relative overflow-hidden border-rose-500/20 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="size-24 text-rose-500" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">
                    <Hourglass className="size-3.5 text-rose-500" />
                    Slowest First Response
                  </Badge>
                  <span className="text-2xl">🐢</span>
                </div>
                <CardTitle className="text-lg font-bold pt-2">Highest Reply Latency</CardTitle>
                <CardDescription className="text-xs">
                  Longest delay before tickets received their initial acknowledgment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Lagging Category:</span>
                    <span className="text-xs font-bold text-foreground">
                      {categoryBottlenecks.response?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Category Avg Latency:</span>
                    <Badge variant="destructive" className="font-mono text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {formatMinutes(categoryBottlenecks.response?.avgResponseMinutes ?? null)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Lagging PM:</span>
                    <span className="text-xs font-bold text-foreground">
                      {pmBottlenecks.response?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">PM Avg Latency:</span>
                    <Badge variant="destructive" className="font-mono text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {formatMinutes(pmBottlenecks.response?.avgResponseMinutes ?? null)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Highest Incident Volume (Buggiest Systems) */}
            <Card className="relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-card via-card to-orange-500/5 shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertTriangle className="size-24 text-orange-500" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1.5 border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10">
                    <TrendingUp className="size-3.5 text-orange-500" />
                    Highest Ticket Burden
                  </Badge>
                  <span className="text-2xl">🚨</span>
                </div>
                <CardTitle className="text-lg font-bold pt-2">Most Bug-Prone Systems</CardTitle>
                <CardDescription className="text-xs">
                  Pinakamaraming tickets filed (heavy defect frequency)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Top Incident System:</span>
                    <span className="text-xs font-bold text-foreground">
                      {categoryBottlenecks.volume?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tickets Filed:</span>
                    <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold">
                      {categoryBottlenecks.volume?.ticketVolume ?? 0} ticket(s)
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Heaviest PM Load:</span>
                    <span className="text-xs font-bold text-foreground">
                      {pmBottlenecks.volume?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tickets Filed:</span>
                    <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold">
                      {pmBottlenecks.volume?.ticketVolume ?? 0} ticket(s)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Slowest Ticket Resolution */}
            <Card className="relative overflow-hidden border-rose-500/20 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Flame className="size-24 text-rose-500" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">
                    <AlertOctagon className="size-3.5 text-rose-500" />
                    Delayed Resolutions
                  </Badge>
                  <span className="text-2xl">⏳</span>
                </div>
                <CardTitle className="text-lg font-bold pt-2">Slowest Ticket Resolution</CardTitle>
                <CardDescription className="text-xs">
                  Longest turnaround time to resolve and close tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Slowest Category:</span>
                    <span className="text-xs font-bold text-foreground">
                      {categoryBottlenecks.resolution?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Resolution Time:</span>
                    <Badge variant="destructive" className="font-mono text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {formatHours(categoryBottlenecks.resolution?.avgResolutionHours ?? null)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Slowest PM:</span>
                    <span className="text-xs font-bold text-foreground">
                      {pmBottlenecks.resolution?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Resolution Time:</span>
                    <Badge variant="destructive" className="font-mono text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {formatHours(pmBottlenecks.resolution?.avgResolutionHours ?? null)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs: By Category vs By PM */}
          <Tabs defaultValue="category" className="w-full space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/60 p-1 rounded-xl border border-border/60">
                <TabsTrigger value="category" className="rounded-lg gap-2 text-xs font-medium">
                  <Layers className="size-3.5" />
                  By Category / System
                </TabsTrigger>
                <TabsTrigger value="pm" className="rounded-lg gap-2 text-xs font-medium">
                  <Users className="size-3.5" />
                  By Project Manager (PM)
                </TabsTrigger>
              </TabsList>

              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>
                  {data.period.startDate && data.period.endDate
                    ? `${new Date(data.period.startDate).toLocaleDateString()} - ${new Date(data.period.endDate).toLocaleDateString()}`
                    : "All Recorded Time"}
                </span>
              </div>
            </div>

            {/* TAB 1: BY CATEGORY */}
            <TabsContent value="category" className="space-y-6 focus-visible:outline-none">
              {/* Category Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Highest Incident Volume */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Highest Ticket Volume</span>
                      <AlertTriangle className="size-4 text-rose-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Categories generating the highest volume of bugs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.rankings.highestVolume}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload as CategoryStat;
                              return (
                                <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                                  <p className="font-bold text-foreground">{d.name}</p>
                                  <p className="text-rose-500 font-medium">Tickets Filed: {d.ticketVolume}</p>
                                  <p className="text-muted-foreground">Unresolved: {d.unresolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ticketVolume" radius={[6, 6, 0, 0]}>
                          {data.categories.rankings.highestVolume.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              className={
                                entry.ticketVolume >= 3
                                  ? "fill-rose-500"
                                  : entry.ticketVolume >= 1
                                  ? "fill-orange-500"
                                  : "fill-muted-foreground/30"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart 2: Slowest First Response */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Slowest Initial Response</span>
                      <Hourglass className="size-4 text-orange-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average delay in minutes to first reply
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.rankings.slowestResponse.map((c) => ({
                          ...c,
                          displayMinutes: c.avgResponseMinutes ?? 0,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          unit="m"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                                  <p className="font-bold text-foreground">{d.name}</p>
                                  <p className="text-rose-500 font-medium">
                                    Delay: {formatMinutes(d.avgResponseMinutes)}
                                  </p>
                                  <p className="text-muted-foreground">Tickets: {d.ticketVolume}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayMinutes" className="fill-orange-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart 3: Slowest Resolution Turnaround */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Prolonged Resolution</span>
                      <Flame className="size-4 text-rose-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average turnaround hours before ticket resolution
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.rankings.slowestResolution.map((c) => ({
                          ...c,
                          displayHours: c.avgResolutionHours ?? 0,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          unit="h"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                                  <p className="font-bold text-foreground">{d.name}</p>
                                  <p className="text-rose-500 font-medium">
                                    Resolution Time: {formatHours(d.avgResolutionHours)}
                                  </p>
                                  <p className="text-muted-foreground">Unresolved: {d.unresolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayHours" className="fill-rose-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Category Shame Leaderboard Table */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <Flame className="size-4" />
                        Category Bottleneck Leaderboard
                      </CardTitle>
                      <CardDescription className="text-xs">
                        High incident volume, longest response latency, and resolution delays
                      </CardDescription>
                    </div>
                    <Badge variant="destructive" className="text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {data.summary.unresolvedTickets} Total Unresolved
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-20">Lag Rank</TableHead>
                          <TableHead>Category / System</TableHead>
                          <TableHead className="text-center">Ticket Volume</TableHead>
                          <TableHead className="text-center">Response Delay</TableHead>
                          <TableHead className="text-center">Resolution Delay</TableHead>
                          <TableHead className="text-center">Pending Tickets</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.categories.rankings.highestVolume.map((cat, idx) => {
                          const isSlowestResp = data.categories.rankings.slowestResponse[0]?.id === cat.id;
                          const isSlowestRes = data.categories.rankings.slowestResolution[0]?.id === cat.id;
                          return (
                            <TableRow key={cat.id} className="hover:bg-muted/30">
                              <TableCell>{renderShameRankBadge(idx)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground flex items-center gap-2">
                                    {cat.name}
                                    {idx === 0 && cat.ticketVolume > 0 && (
                                      <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] py-0">
                                        🚨 Highest Bugs
                                      </Badge>
                                    )}
                                    {isSlowestResp && cat.avgResponseMinutes !== null && (
                                      <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400 text-[10px] py-0">
                                        🐢 Slowest Reply
                                      </Badge>
                                    )}
                                    {isSlowestRes && cat.avgResolutionHours !== null && (
                                      <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] py-0">
                                        ⏳ Longest Delay
                                      </Badge>
                                    )}
                                  </span>
                                  {cat.description && (
                                    <span className="text-xs text-muted-foreground truncate max-w-sm">
                                      {cat.description}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                                  {cat.ticketVolume}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">tickets</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="font-mono text-xs border-orange-500/30 text-orange-600 dark:text-orange-400">
                                  {formatMinutes(cat.avgResponseMinutes)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="font-mono text-xs border-rose-500/30 text-rose-600 dark:text-rose-400">
                                  {formatHours(cat.avgResolutionHours)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono font-semibold text-xs text-muted-foreground">
                                  {cat.unresolvedCount} active
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: BY PROJECT MANAGER (PM) */}
            <TabsContent value="pm" className="space-y-6 focus-visible:outline-none">
              {/* PM Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PM Chart 1: Highest Ticket Burden */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Highest Ticket Burden per PM</span>
                      <Users className="size-4 text-rose-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Number of tickets under PM scope during this period
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.pms.rankings.highestVolume}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload as PmStat;
                              return (
                                <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                                  <p className="font-bold text-foreground">{d.name}</p>
                                  <p className="text-rose-500 font-medium">Tickets: {d.ticketVolume}</p>
                                  <p className="text-muted-foreground">Scope: {d.assignedCategory}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ticketVolume" className="fill-rose-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* PM Chart 2: Slowest Response */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>PM Response Delay</span>
                      <Hourglass className="size-4 text-orange-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average reply latency in minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.pms.rankings.slowestResponse.map((p) => ({
                          ...p,
                          displayMinutes: p.avgResponseMinutes ?? 0,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          unit="m"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                                  <p className="font-bold text-foreground">{d.name}</p>
                                  <p className="text-orange-500 font-medium">
                                    Delay: {formatMinutes(d.avgResponseMinutes)}
                                  </p>
                                  <p className="text-muted-foreground">Pending: {d.unresolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayMinutes" className="fill-orange-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* PM Chart 3: Slowest Resolution */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>PM Resolution Delay</span>
                      <Flame className="size-4 text-rose-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average turnaround hours before ticket resolution
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.pms.rankings.slowestResolution.map((p) => ({
                          ...p,
                          displayHours: p.avgResolutionHours ?? 0,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          unit="h"
                          className="text-muted-foreground fill-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-border bg-popover p-2.5 shadow-md text-xs">
                                  <p className="font-bold text-foreground">{d.name}</p>
                                  <p className="text-rose-500 font-medium">
                                    Resolution: {formatHours(d.avgResolutionHours)}
                                  </p>
                                  <p className="text-muted-foreground">Unresolved: {d.unresolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayHours" className="fill-rose-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* PM Shame Leaderboard Table */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <Flame className="size-4" />
                        Project Manager Bottleneck Leaderboard
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Delayed first replies, highest volume burdens, and stalled tickets
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {data.pms.stats.length} PM(s) Tracked
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-20">Lag Rank</TableHead>
                          <TableHead>Project Manager</TableHead>
                          <TableHead>Scope / System</TableHead>
                          <TableHead className="text-center">Tickets</TableHead>
                          <TableHead className="text-center">Response Delay</TableHead>
                          <TableHead className="text-center">Resolution Delay</TableHead>
                          <TableHead className="text-center">Unresolved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pms.rankings.highestVolume.map((pm, idx) => (
                          <TableRow key={pm.id} className="hover:bg-muted/30">
                            <TableCell>{renderShameRankBadge(idx)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8">
                                  <AvatarImage src={pm.avatarUrl} alt={pm.name} />
                                  <AvatarFallback className="bg-rose-500/10 text-rose-600 font-bold text-xs">
                                    {pm.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground">{pm.name}</span>
                                  <span className="text-xs text-muted-foreground">{pm.email}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {pm.assignedCategory}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                              {pm.ticketVolume}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono text-xs border-orange-500/30 text-orange-600 dark:text-orange-400">
                                {formatMinutes(pm.avgResponseMinutes)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono text-xs border-rose-500/30 text-rose-600 dark:text-rose-400">
                                {formatHours(pm.avgResolutionHours)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-mono font-semibold text-xs text-rose-600 dark:text-rose-400">
                                {pm.unresolvedCount} active
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
