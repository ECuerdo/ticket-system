"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Inbox,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DevTicketItem {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at?: string;
  is_human_error?: boolean;
  pm_notes?: string;
  dev_notes?: string;
  system_types?: { name: string };
  profiles?: { full_name: string; email: string };
}

export function DevTicketsTab() {
  const [tickets, setTickets] = useState<DevTicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<DevTicketItem | null>(null);
  const [devNotes, setDevNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/dev-workplace");
      const json = await res.json();
      const updatedTickets = json.tickets || [];
      setTickets(updatedTickets);
      setSelectedTicket((prev) => (prev ? updatedTickets.find((t: DevTicketItem) => t.id === prev.id) || prev : null));
    } catch {
      console.error("Failed to load dev tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  const ticketsRef = useRef(tickets);
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel("dev-tickets-list-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        () => {
          // New Ticket
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldTicket = ticketsRef.current.find((t) => t.id === payload.new?.id);
          // Only trigger on Changed Status (or ticket newly assigned to this dev)
          if (!oldTicket || oldTicket.status !== newStatus) {
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleResolveTicket = async (status: "IN_DEVELOPMENT" | "RESOLVED") => {
    if (!selectedTicket) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          devNotes,
        }),
      });

      if (!res.ok) throw new Error("Failed to update ticket.");

      await loadData();
      if (status === "RESOLVED") {
        setSelectedTicket(null);
        setDevNotes("");
      } else {
        setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      alert("Failed to submit status update.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p?: string | null) => {
    if (!p) return null;
    switch (p) {
      case "URGENT":
        return <Badge variant="outline" className="border-red-500/40 text-red-500 bg-red-500/10 text-[10px]">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px]">High</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-500 bg-blue-500/10 text-[10px]">Medium</Badge>;
      case "LOW":
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "CONFIRMED_BUG":
        return <Badge variant="outline" className="border-purple-500 text-purple-500 text-[10px]">Assigned</Badge>;
      case "IN_DEVELOPMENT":
        return <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px]">In Dev</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-[10px]">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.system_types?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Assigned Tickets</h2>
        <p className="text-sm text-muted-foreground">
          View all tickets assigned to you by Project Managers, update progress, and submit resolution notes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search assigned tickets by #, title, or system..."
            className="text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-xs outline-none focus-visible:border-ring"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED_BUG">Assigned (Ready)</option>
            <option value="IN_DEVELOPMENT">In Development</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:h-[calc(100vh-15.5rem)] lg:min-h-[600px] lg:max-h-[820px]">
        {/* Ticket List */}
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col">
          <Card className="border-border shadow-xs h-full flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/70 shrink-0">
              <CardTitle className="text-base flex items-center justify-between">
                <span>My Assigned Backlog ({filteredTickets.length})</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Assigned by PM
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <Inbox className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No tickets assigned to you currently.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {paginatedTickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`p-4 space-y-2 cursor-pointer transition-colors ${
                          isSelected ? "bg-muted/60 border-l-4 border-l-primary" : "hover:bg-muted/30"
                        }`}
                        onClick={() => {
                          setSelectedTicket(t);
                          setDevNotes(t.dev_notes || "");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-primary font-bold">
                            {t.ticket_number}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {t.is_human_error && (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px]">
                                Human Error
                              </Badge>
                            )}
                            {getPriorityBadge(t.priority)}
                            {getStatusBadge(t.status)}
                          </div>
                        </div>

                        <h4 className="font-semibold text-sm line-clamp-1">{t.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>

                        {t.pm_notes && (
                          <div className="bg-purple-500/10 border-l-2 border-purple-500 p-2 rounded text-[11px] text-purple-900 dark:text-purple-200">
                            <span className="font-semibold">PM Instructions:</span> {t.pm_notes}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t border-border/60">
                          <div className="flex items-center gap-1">
                            <Layers className="size-3 text-primary" />
                            <span>{t.system_types?.name}</span>
                          </div>
                          <span>Client: {t.profiles?.full_name || "Client"}</span>
                        </div>

                        {t.created_at && (
                          <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground/80">
                            <Clock className="size-3 shrink-0 text-muted-foreground/60" />
                            <span>
                              Created: {new Date(t.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}{" "}
                              &bull;{" "}
                              {new Date(t.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>

            {/* Pagination & Rows Footer */}
            {filteredTickets.length > 0 && (
              <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border/70 text-xs text-muted-foreground bg-muted/10">
                <div className="flex items-center gap-2">
                  <span>Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 rounded-md border border-input bg-background px-2 py-0.5 text-xs text-foreground outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>
                    {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredTickets.length)} of {filteredTickets.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={validCurrentPage <= 1}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <span className="px-1 text-[11px]">
                    {validCurrentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={validCurrentPage >= totalPages}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Work & Resolution Area */}
        <div className="lg:col-span-5 h-full min-h-0 flex flex-col">
          {selectedTicket ? (
            <Card className="border-border shadow-xs h-full flex flex-col min-h-0 overflow-hidden">
              <CardHeader className="pb-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {selectedTicket.ticket_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedTicket.is_human_error && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px]">
                        Human Error
                      </Badge>
                    )}
                    {getStatusBadge(selectedTicket.status)}
                    <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/tickets/${selectedTicket.id}`} />}>
                      <MessageSquare className="size-3 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-base mt-1">{selectedTicket.title}</CardTitle>
                <CardDescription className="text-xs">
                  System: {selectedTicket.system_types?.name}
                </CardDescription>
                {selectedTicket.created_at && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3 shrink-0 text-muted-foreground/70" />
                    <span>
                      Created: {new Date(selectedTicket.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(selectedTicket.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                {/* Contextual Status Banner */}
                {selectedTicket.status === "CONFIRMED_BUG" && (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                    <Inbox className="size-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Assigned & Queued:</span> This bug was confirmed by your PM and assigned to you. Click &quot;Start Development&quot; below when ready.
                    </div>
                  </div>
                )}

                {selectedTicket.status === "IN_DEVELOPMENT" && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Actively in Progress:</span> Enter your code fixes or PR links below and click &quot;Mark as Resolved&quot; once deployed.
                    </div>
                  </div>
                )}

                {selectedTicket.status === "RESOLVED" && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Resolved & Verified:</span> You marked this issue as resolved.
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Issue Description</Label>
                  <p className="mt-1 text-xs bg-muted/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed break-words">
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.pm_notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">PM Notes / Context</Label>
                    <p className="mt-1 text-xs bg-purple-500/10 text-purple-900 dark:text-purple-200 p-2.5 rounded-lg border border-purple-500/20">
                      {selectedTicket.pm_notes}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="dev-resolution-notes" className="text-xs font-semibold">
                    Resolution Notes & PR / Commit References
                  </Label>
                  <Textarea
                    id="dev-resolution-notes"
                    rows={4}
                    className="text-xs"
                    placeholder="e.g. Fixed null state in checkout handler. Merged in commit #9a2b1."
                    value={devNotes}
                    onChange={(e) => setDevNotes(e.target.value)}
                  />
                </div>
              </CardContent>

              <CardFooter className="shrink-0 flex flex-col gap-2 border-t border-border p-4 bg-muted/20">
                {selectedTicket.status === "CONFIRMED_BUG" && (
                  <Button
                    size="sm"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={submitting}
                    onClick={() => handleResolveTicket("IN_DEVELOPMENT")}
                  >
                    <Clock className="size-3.5 mr-1.5" />
                    Start Development
                  </Button>
                )}

                {selectedTicket.status === "IN_DEVELOPMENT" && (
                  <>
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={submitting}
                      onClick={() => handleResolveTicket("RESOLVED")}
                    >
                      <CheckCircle2 className="size-3.5 mr-1.5" />
                      Mark as Resolved
                    </Button>
                    {devNotes !== (selectedTicket.dev_notes || "") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={submitting}
                        onClick={() => handleResolveTicket("IN_DEVELOPMENT")}
                      >
                        Save Progress Notes
                      </Button>
                    )}
                  </>
                )}

                {selectedTicket.status === "RESOLVED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                    disabled={submitting}
                    onClick={() => handleResolveTicket("IN_DEVELOPMENT")}
                  >
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Reopen / Continue Development
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-dashed border-border p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center min-h-[350px]">
              <Inbox className="size-10 mx-auto mb-3 opacity-30" />
              <h3 className="font-semibold text-sm text-foreground">No Ticket Selected</h3>
              <p className="text-xs mt-1 max-w-xs">
                Select an assigned ticket from the left to start working and submit your resolution notes.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

