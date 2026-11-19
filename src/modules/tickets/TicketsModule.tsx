"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  Search,
  Filter,
  Paperclip,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TicketListItem {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority?: string | null;
  status: string;
  created_at: string;
  pm_notes?: string;
  dev_notes?: string;
  rejection_reason?: string;
  attachments?: Array<{ name: string; url: string; size: number; type: string }>;
  system_types?: { name: string };
}

export default function TicketsModule() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    let ignore = false;
    async function loadTickets() {
      try {
        const ticketsRes = await fetch("/api/tickets");
        const ticketsJson = await ticketsRes.json();
        if (!ignore) {
          setTickets(ticketsJson.tickets || []);
        }
      } catch {
        console.error("Failed to load tickets");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadTickets();
    return () => {
      ignore = true;
    };
  }, []);

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    switch (priority) {
      case "URGENT":
        return (
          <Badge variant="outline" className="border-red-400/40 text-red-500 bg-red-50 dark:bg-red-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            Urgent
          </Badge>
        );
      case "HIGH":
        return (
          <Badge variant="outline" className="border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            High
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge variant="outline" className="border-blue-400/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            Medium
          </Badge>
        );
      case "LOW":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground font-medium text-[11px] px-2.5 py-0.5 rounded-full">
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
          <Badge variant="outline" className="border-blue-400/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            Open
          </Badge>
        );
      case "CONFIRMED_BUG":
        return (
          <Badge variant="outline" className="border-purple-400/40 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            Confirmed Bug
          </Badge>
        );
      case "IN_DEVELOPMENT":
        return (
          <Badge variant="outline" className="border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            In Dev
          </Badge>
        );
      case "RESOLVED":
        return (
          <Badge variant="outline" className="border-emerald-400/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            Closed
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 font-medium text-[11px] px-2.5 py-0.5 rounded-full">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 rounded-full">
            {status}
          </Badge>
        );
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.system_types?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 w-full">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Ticket className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">My Support Tickets</h1>
            <p className="text-xs text-muted-foreground">
              Search, filter, and track all tickets and issue reports you have submitted.
            </p>
          </div>
        </div>
        <Button
          nativeButton={false}
          className="rounded-2xl px-4 py-2 font-semibold shadow-md shadow-primary/20"
          render={<Link href="/create-ticket" />}
        >
          <PlusCircle className="size-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, title, or system..."
            className="pl-10 text-xs rounded-2xl h-10 border-border/70 bg-card shadow-2xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-10 rounded-2xl border border-border/70 bg-card shadow-2xs text-muted-foreground">
            <Filter className="size-4" />
          </div>
          <select
            className="h-10 rounded-2xl border border-border/70 bg-card px-4 py-1 text-xs outline-none shadow-2xs font-medium text-foreground"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CONFIRMED_BUG">Confirmed Bug</option>
            <option value="IN_DEVELOPMENT">In Development</option>
            <option value="RESOLVED">Resolved / Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Tickets */}
        <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-2xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Ticket className="size-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">Total Tickets</div>
            <div className="text-xl font-bold text-foreground">
              {loading ? "..." : tickets.length}
            </div>
          </div>
        </div>

        {/* Urgent Tickets */}
        <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-red-200/70 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 shadow-2xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-500">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-red-600 dark:text-red-400">Urgent</div>
            <div className="text-xl font-bold text-foreground">
              {loading ? "..." : tickets.filter((t) => t.priority === "URGENT").length}
            </div>
          </div>
        </div>

        {/* In Dev */}
        <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 shadow-2xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <span className="font-mono text-sm font-bold">&lt;/&gt;</span>
          </div>
          <div>
            <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">In Dev</div>
            <div className="text-xl font-bold text-foreground">
              {loading ? "..." : tickets.filter((t) => t.status === "IN_DEVELOPMENT").length}
            </div>
          </div>
        </div>

        {/* Closed */}
        <div className="relative flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Closed</div>
            <div className="text-xl font-bold text-foreground">
              {loading ? "..." : tickets.filter((t) => t.status === "RESOLVED").length}
            </div>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">
            My Tickets ({filteredTickets.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Viewing your active and historical submitted tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading tickets...</p>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <LifeBuoy className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets found matching your query.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3.5">
                {paginatedTickets.map((t) => {
                  const isRedUrgent = t.priority === "URGENT";
                  const leftBorderClass = isRedUrgent
                    ? "border-l-4 border-l-red-500 hover:border-l-red-600"
                    : "border-l-4 border-l-blue-500 hover:border-l-blue-600";
                  const avatarBgClass = isRedUrgent
                    ? "bg-red-50 dark:bg-red-950/40 text-red-500 border border-red-200 dark:border-red-900/40"
                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-500 border border-blue-200 dark:border-blue-900/40";

                  return (
                    <div
                      key={t.id}
                      onClick={() => router.push(`/tickets/${t.id}`)}
                      className={`group/ticket relative p-4 transition-all duration-150 bg-card hover:bg-muted/30 cursor-pointer rounded-2xl border border-border/80 shadow-2xs flex items-start gap-3.5 ${leftBorderClass}`}
                    >
                      {/* Left icon circle */}
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl mt-0.5 ${avatarBgClass}`}>
                        {isRedUrgent ? (
                          <span className="font-mono text-xs font-bold">&lt;/&gt;</span>
                        ) : (
                          <LifeBuoy className="size-5" />
                        )}
                      </div>

                      {/* Right Main Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Top row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground group-hover/ticket:text-primary transition-colors">
                              {t.ticket_number}
                            </span>
                            <span className="text-muted-foreground/60 text-xs">•</span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {t.system_types?.name || "General"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {getPriorityBadge(t.priority)}
                            {getStatusBadge(t.status)}
                          </div>
                        </div>

                        {/* Title and description */}
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-foreground group-hover/ticket:text-primary transition-colors line-clamp-1">
                            {t.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        </div>

                        {/* Attachments chips */}
                        {t.attachments && t.attachments.length > 0 && (
                          <div
                            className="flex flex-wrap gap-2 pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.attachments.map((file) => (
                              <a
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Paperclip className="size-3 text-primary" />
                                <span className="max-w-[160px] truncate">{file.name}</span>
                                <ExternalLink className="size-2.5 text-muted-foreground" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Status Notes pills (matching the screenshot) */}
                        {(t.pm_notes || t.dev_notes || t.rejection_reason) && (
                          <div className="space-y-1.5 pt-1">
                            {t.pm_notes && (
                              <div className="flex items-center gap-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 px-3 py-1.5 text-xs">
                                <span className="font-medium text-purple-700 dark:text-purple-300 shrink-0 flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full bg-purple-600" />
                                  PM Verification:
                                </span>
                                <span className="text-purple-900 dark:text-purple-200 line-clamp-1">
                                  {t.pm_notes}
                                </span>
                              </div>
                            )}

                            {t.rejection_reason && (
                              <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 px-3 py-1.5 text-xs">
                                <span className="font-medium text-red-600 dark:text-red-400 shrink-0 flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full bg-red-500" />
                                  Rejection Note:
                                </span>
                                <span className="text-red-900 dark:text-red-200 line-clamp-1">
                                  {t.rejection_reason}
                                </span>
                              </div>
                            )}

                            {t.dev_notes && (
                              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 px-3 py-1.5 text-xs">
                                <span className="font-medium text-emerald-700 dark:text-emerald-300 shrink-0 flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full bg-emerald-600" />
                                  Dev Resolution:
                                </span>
                                <span className="text-emerald-950 dark:text-emerald-200 line-clamp-1">
                                  {t.dev_notes}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer row */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 text-muted-foreground/70" />
                            <span>Logged on {new Date(t.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-primary font-medium group-hover/ticket:translate-x-0.5 transition-transform">
                            <span>View thread</span>
                            <span>&rarr;</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination and Rows per page */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 mt-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 rounded-xl border border-input bg-card px-2.5 py-1 text-xs text-foreground outline-none focus-visible:border-ring shadow-2xs"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    Showing {filteredTickets.length === 0 ? 0 : startIndex + 1}-
                    {Math.min(startIndex + rowsPerPage, filteredTickets.length)} of {filteredTickets.length}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-end">
                  <span className="mr-1 text-[11px]">
                    Page {validCurrentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-xl"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={validCurrentPage <= 1}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">Previous page</span>
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= validCurrentPage - 1 && page <= validCurrentPage + 1)
                    ) {
                      const isCurrent = page === validCurrentPage;
                      return (
                        <Button
                          key={page}
                          variant={isCurrent ? "default" : "outline"}
                          size="icon"
                          className={`size-8 text-xs rounded-xl ${
                            isCurrent ? "bg-primary text-primary-foreground font-bold shadow-xs" : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    }
                    if (page === validCurrentPage - 2 || page === validCurrentPage + 2) {
                      return (
                        <span key={page} className="px-0.5 text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-xl"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={validCurrentPage >= totalPages}
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Next page</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

