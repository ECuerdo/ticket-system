"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  MessageSquare,
  Search,
  Filter,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  CheckCheck,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface TicketReport {
  id: string;
  ticket_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  admin_notes?: string | null;
  created_at: string;
  ticket?: {
    id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority?: string | null;
    created_at: string;
    system_types?: { name: string } | null;
  } | null;
  reporter?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

function getRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function ReportsTab() {
  const [reports, setReports] = useState<TicketReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      const res = await fetch("/api/admin-workplace/reports");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    try {
      const res = await fetch("/api/admin-workplace/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update report");
      }

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update report status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const tNumber = r.ticket?.ticket_number?.toLowerCase() || "";
    const tTitle = r.ticket?.title?.toLowerCase() || "";
    const reporterName = r.reporter?.full_name?.toLowerCase() || "";
    const reporterEmail = r.reporter?.email?.toLowerCase() || "";
    const reason = r.reason?.toLowerCase() || "";

    return (
      tNumber.includes(q) ||
      tTitle.includes(q) ||
      reporterName.includes(q) ||
      reporterEmail.includes(q) ||
      reason.includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10 text-[10px]">
            <Clock className="size-2.5 mr-1" />
            Pending Review
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-500/10 text-[10px]">
            <Eye className="size-2.5 mr-1" />
            Reviewed
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10 text-[10px]">
            <CheckCheck className="size-2.5 mr-1" />
            Resolved
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Client Incident & Chat Reports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Private reports filed by clients regarding tickets and conversations. Confidential from PMs and Devs.
          </p>
        </div>
        <Badge variant="outline" className="w-fit text-xs px-2.5 py-1 font-mono">
          {reports.length} Total Reports
        </Badge>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by ticket #, title, client, or reason..."
            className="pl-8 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full sm:w-auto rounded-lg border border-input bg-background px-3 py-1 text-xs outline-none focus-visible:border-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs">Loading incident reports...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-dashed border-border p-12 text-center text-muted-foreground">
          <ShieldAlert className="size-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">No Reports Found</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            {search || statusFilter !== "ALL"
              ? "No reports match your current filter criteria."
              : "No clients have reported any ticket conversations yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isUpdating = updatingId === report.id;
            const reporterInitials = report.reporter?.full_name
              ? report.reporter.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "CL";

            return (
              <Card
                key={report.id}
                className="border-border shadow-xs hover:border-border/90 transition-all overflow-hidden"
              >
                <CardHeader className="pb-3 border-b border-border/60 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      {report.ticket?.ticket_number || "TICKET"}
                    </span>
                    <span className="font-semibold text-sm truncate max-w-[220px] sm:max-w-md">
                      {report.ticket?.title || "Untitled Ticket"}
                    </span>
                    {report.ticket?.system_types?.name && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {report.ticket.system_types.name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(report.status)}
                    <span
                      className="text-[11px] text-muted-foreground font-mono"
                      title={new Date(report.created_at).toLocaleString()}
                    >
                      {getRelativeTime(report.created_at)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Reporter Attribution */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px] bg-muted font-bold">
                        {reporterInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      Reported by <strong className="text-foreground">{report.reporter?.full_name || "Client"}</strong> ({report.reporter?.email || "No email"})
                    </span>
                  </div>

                  {/* Reason Callout Box */}
                  <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs space-y-1">
                    <div className="font-semibold text-destructive flex items-center gap-1.5 text-xs">
                      <AlertCircle className="size-3.5" />
                      Client Stated Reason:
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium">
                      {report.reason}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border/60 p-3 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Status update actions */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[11px] text-muted-foreground font-medium mr-1">Status:</span>
                    {report.status !== "REVIEWED" && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={isUpdating}
                        onClick={() => handleUpdateReportStatus(report.id, "REVIEWED")}
                        className="text-[11px] text-blue-600 hover:bg-blue-500/10"
                      >
                        <Eye className="size-3 mr-1" />
                        Mark Reviewed
                      </Button>
                    )}
                    {report.status !== "RESOLVED" && (
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={isUpdating}
                        onClick={() => handleUpdateReportStatus(report.id, "RESOLVED")}
                        className="text-[11px] text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <CheckCheck className="size-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {report.status !== "PENDING" && (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={isUpdating}
                        onClick={() => handleUpdateReportStatus(report.id, "PENDING")}
                        className="text-[11px] text-muted-foreground"
                      >
                        Reset to Pending
                      </Button>
                    )}
                  </div>

                  {/* Direct Chat Thread Button */}
                  <Button
                    variant="default"
                    size="xs"
                    nativeButton={false}
                    render={<Link href={`/tickets/${report.ticket_id}`} />}
                    className="w-full sm:w-auto text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    <MessageSquare className="size-3.5 mr-1.5" />
                    Open Chat Thread
                    <ExternalLink className="size-3 ml-1.5 opacity-70" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
