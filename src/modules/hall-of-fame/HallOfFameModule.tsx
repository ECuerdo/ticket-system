"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Trophy,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Users,
  RefreshCw,
  Award,
  AlertCircle,
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
  avgResponseMinutes: number | null;
  resolvedCount: number;
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
  avgResponseMinutes: number | null;
  resolvedCount: number;
  avgResolutionHours: number | null;
}

interface HallOfFameData {
  timeRange: TimeRange;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    totalCategories: number;
    totalPms: number;
  };
  categories: {
    stats: CategoryStat[];
    rankings: {
      fastestResponse: CategoryStat[];
      lowestVolume: CategoryStat[];
      fastestResolution: CategoryStat[];
    };
  };
  pms: {
    stats: PmStat[];
    rankings: {
      fastestResponse: PmStat[];
      lowestVolume: PmStat[];
      fastestResolution: PmStat[];
    };
  };
}

export default function HallOfFameModule() {
  const [timeRange, setTimeRange] = useState<TimeRange>("this_week");
  const [data, setData] = useState<HallOfFameData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (range: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hall-of-fame?timeRange=${range}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load Hall of Fame reports");
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

  // Medal Badge Helper
  const renderRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
          🥇 1st Place
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-400/15 text-slate-600 dark:text-slate-300 border border-slate-400/30 shadow-xs">
          🥈 2nd Place
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-700/15 text-amber-700 dark:text-amber-500 border border-amber-700/30 shadow-xs">
          🥉 3rd Place
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center size-6 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
        #{index + 1}
      </span>
    );
  };

  // Top Champions derived from data
  const categoryChampions = useMemo(() => {
    if (!data) return { response: null, volume: null, resolution: null };
    return {
      response: data.categories.rankings.fastestResponse[0] || null,
      volume: data.categories.rankings.lowestVolume[0] || null,
      resolution: data.categories.rankings.fastestResolution[0] || null,
    };
  }, [data]);

  const pmChampions = useMemo(() => {
    if (!data) return { response: null, volume: null, resolution: null };
    return {
      response: data.pms.rankings.fastestResponse[0] || null,
      volume: data.pms.rankings.lowestVolume[0] || null,
      resolution: data.pms.rankings.fastestResolution[0] || null,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <Trophy className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
                Hall of Fame
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Performance rankings & recognition for Fastest Response, System Stability, and Quickest Resolution.
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
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
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
          {/* Champion Podium Spotlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Fastest Response Champion */}
            <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="size-24 text-amber-500" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    <Zap className="size-3.5 fill-amber-500 text-amber-500" />
                    Speed Champion
                  </Badge>
                  <span className="text-2xl">⚡</span>
                </div>
                <CardTitle className="text-lg font-bold pt-2">Fastest First Response</CardTitle>
                <CardDescription className="text-xs">
                  Shortest duration from ticket filing to first staff reply
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Top Category:</span>
                    <span className="text-xs font-bold text-foreground">
                      {categoryChampions.response?.name || "None yet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Category Avg:</span>
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {formatMinutes(categoryChampions.response?.avgResponseMinutes ?? null)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Top PM:</span>
                    <span className="text-xs font-bold text-foreground">
                      {pmChampions.response?.name || "None yet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">PM Avg:</span>
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {formatMinutes(pmChampions.response?.avgResponseMinutes ?? null)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Stability Champion (Fewest bugs / tickets) */}
            <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="size-24 text-emerald-500" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    <ShieldCheck className="size-3.5 text-emerald-500" />
                    Stability Leader
                  </Badge>
                  <span className="text-2xl">🛡️</span>
                </div>
                <CardTitle className="text-lg font-bold pt-2">Lowest Ticket Volume</CardTitle>
                <CardDescription className="text-xs">
                  Fewest tickets filed (cleanest & highest quality systems)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Cleanest System:</span>
                    <span className="text-xs font-bold text-foreground">
                      {categoryChampions.volume?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tickets Filed:</span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                      {categoryChampions.volume?.ticketVolume ?? 0} ticket(s)
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Cleanest PM Scope:</span>
                    <span className="text-xs font-bold text-foreground">
                      {pmChampions.volume?.name || "None"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tickets Filed:</span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                      {pmChampions.volume?.ticketVolume ?? 0} ticket(s)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Resolution Ace */}
            <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-xs">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CheckCircle2 className="size-24 text-blue-500" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                    <Award className="size-3.5 text-blue-500" />
                    Resolution Ace
                  </Badge>
                  <span className="text-2xl">🏆</span>
                </div>
                <CardTitle className="text-lg font-bold pt-2">Fastest Ticket Resolution</CardTitle>
                <CardDescription className="text-xs">
                  Quickest turnaround time to resolve and close tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Top Category:</span>
                    <span className="text-xs font-bold text-foreground">
                      {categoryChampions.resolution?.name || "None yet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Turnaround:</span>
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {formatHours(categoryChampions.resolution?.avgResolutionHours ?? null)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Top PM:</span>
                    <span className="text-xs font-bold text-foreground">
                      {pmChampions.resolution?.name || "None yet"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Turnaround:</span>
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {formatHours(pmChampions.resolution?.avgResolutionHours ?? null)}
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
                {/* Chart 1: Volume */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Ticket Volume by Category</span>
                      <ShieldCheck className="size-4 text-emerald-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Lower volume indicates cleaner systems (fewest defects reported)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.stats}
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
                                  <p className="text-emerald-500 font-medium">Tickets: {d.ticketVolume}</p>
                                  <p className="text-muted-foreground">Resolved: {d.resolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ticketVolume" radius={[6, 6, 0, 0]}>
                          {data.categories.stats.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              className={
                                entry.ticketVolume === 0
                                  ? "fill-emerald-500"
                                  : entry.ticketVolume <= 2
                                  ? "fill-sky-500"
                                  : "fill-amber-500"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart 2: First Response Time */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Avg First Response Time</span>
                      <Zap className="size-4 text-amber-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average minutes from ticket creation to first reply
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.stats.map((c) => ({
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
                                  <p className="text-amber-500 font-medium">
                                    Avg Response: {formatMinutes(d.avgResponseMinutes)}
                                  </p>
                                  <p className="text-muted-foreground">Responded: {d.respondedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayMinutes" className="fill-amber-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Chart 3: Resolution Time */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Avg Resolution Turnaround</span>
                      <Clock className="size-4 text-blue-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average hours from ticket creation to resolved status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categories.stats.map((c) => ({
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
                                  <p className="text-blue-500 font-medium">
                                    Turnaround: {formatHours(d.avgResolutionHours)}
                                  </p>
                                  <p className="text-muted-foreground">Resolved: {d.resolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayHours" className="fill-blue-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Category Leaderboard Table */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Category Performance Leaderboard</CardTitle>
                      <CardDescription className="text-xs">
                        Complete breakdown of ticket volume, response latency, and resolution speed
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {data.categories.stats.length} Categories Tracked
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Category / System</TableHead>
                          <TableHead className="text-center">Ticket Volume</TableHead>
                          <TableHead className="text-center">Avg Response Time</TableHead>
                          <TableHead className="text-center">Avg Resolution Time</TableHead>
                          <TableHead className="text-center">Stability Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.categories.rankings.lowestVolume.map((cat, idx) => {
                          const isFastest = data.categories.rankings.fastestResponse[0]?.id === cat.id;
                          const isQuickestResolve = data.categories.rankings.fastestResolution[0]?.id === cat.id;
                          return (
                            <TableRow key={cat.id} className="hover:bg-muted/30">
                              <TableCell>{renderRankBadge(idx)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground flex items-center gap-2">
                                    {cat.name}
                                    {idx === 0 && (
                                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] py-0">
                                        🛡️ Cleanest
                                      </Badge>
                                    )}
                                    {isFastest && (
                                      <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] py-0">
                                        ⚡ Fastest Reply
                                      </Badge>
                                    )}
                                    {isQuickestResolve && (
                                      <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] py-0">
                                        🏆 Quick Resolve
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
                                <span className="font-mono font-bold text-sm">
                                  {cat.ticketVolume}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">tickets</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {formatMinutes(cat.avgResponseMinutes)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {formatHours(cat.avgResolutionHours)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        cat.ticketVolume === 0
                                          ? "w-full bg-emerald-500"
                                          : cat.ticketVolume <= 2
                                          ? "w-3/4 bg-blue-500"
                                          : "w-1/3 bg-amber-500"
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {cat.ticketVolume === 0 ? "Exceptional" : cat.ticketVolume <= 2 ? "High Stability" : "Active Flow"}
                                  </span>
                                </div>
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
                {/* PM Chart 1: Volume */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Tickets Handled per PM</span>
                      <Users className="size-4 text-purple-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tickets under PM scope during this period
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.pms.stats}
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
                                  <p className="text-purple-500 font-medium">Tickets: {d.ticketVolume}</p>
                                  <p className="text-muted-foreground">Scope: {d.assignedCategory}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ticketVolume" className="fill-purple-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* PM Chart 2: First Response */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>PM First Response Speed</span>
                      <Zap className="size-4 text-amber-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average response time in minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.pms.stats.map((p) => ({
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
                                  <p className="text-amber-500 font-medium">
                                    Response: {formatMinutes(d.avgResponseMinutes)}
                                  </p>
                                  <p className="text-muted-foreground">Responded: {d.respondedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayMinutes" className="fill-amber-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* PM Chart 3: Resolution */}
                <Card className="border-border/60 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>PM Resolution Efficiency</span>
                      <Clock className="size-4 text-blue-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average turnaround hours to resolve tickets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.pms.stats.map((p) => ({
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
                                  <p className="text-blue-500 font-medium">
                                    Turnaround: {formatHours(d.avgResolutionHours)}
                                  </p>
                                  <p className="text-muted-foreground">Resolved: {d.resolvedCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="displayHours" className="fill-blue-500" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* PM Leaderboard Table */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Project Manager Leaderboard</CardTitle>
                      <CardDescription className="text-xs">
                        Individual performance, response urgency, and resolution throughput
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
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Project Manager</TableHead>
                          <TableHead>Scope / System</TableHead>
                          <TableHead className="text-center">Tickets</TableHead>
                          <TableHead className="text-center">First Response</TableHead>
                          <TableHead className="text-center">Resolution Time</TableHead>
                          <TableHead className="text-center">Resolved Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pms.rankings.fastestResponse.length > 0 ? (
                          data.pms.rankings.fastestResponse.map((pm, idx) => (
                            <TableRow key={pm.id} className="hover:bg-muted/30">
                              <TableCell>{renderRankBadge(idx)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="size-8">
                                    <AvatarImage src={pm.avatarUrl} alt={pm.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
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
                              <TableCell className="text-center font-mono font-bold text-sm">
                                {pm.ticketVolume}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                                  {formatMinutes(pm.avgResponseMinutes)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                                  {formatHours(pm.avgResolutionHours)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                                  {pm.resolvedCount} resolved
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          data.pms.stats.map((pm, idx) => (
                            <TableRow key={pm.id} className="hover:bg-muted/30">
                              <TableCell>{renderRankBadge(idx)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="size-8">
                                    <AvatarImage src={pm.avatarUrl} alt={pm.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
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
                              <TableCell className="text-center font-mono font-bold text-sm">
                                {pm.ticketVolume}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                                  {formatMinutes(pm.avgResponseMinutes)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                                  {formatHours(pm.avgResolutionHours)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-mono font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                                  {pm.resolvedCount} resolved
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
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
