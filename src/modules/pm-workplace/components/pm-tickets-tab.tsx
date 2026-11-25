"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  Layers,
  Inbox,
  Filter,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

interface PMTicketItem {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority?: string | null;
  status: string;
  pm_notes?: string;
  rejection_reason?: string;
  assigned_dev_id?: string;
  system_type_id?: string;
  choice_id?: string;
  is_human_error?: boolean;
  system_types?: { name: string };
  profiles?: { full_name: string };
  dev?: { full_name: string; email: string };
}

interface SystemChoiceItem {
  id: string;
  label: string;
  description?: string;
}

interface SystemTypeItem {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  system_choices?: SystemChoiceItem[];
}

interface DeveloperItem {
  id: string;
  full_name: string;
  email: string;
}

export function PmTicketsTab() {
  const [tickets, setTickets] = useState<PMTicketItem[]>([]);
  const [myDevs, setMyDevs] = useState<DeveloperItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<PMTicketItem | null>(null);
  const [selectedPriority, setSelectedPriority] = useState("MEDIUM");
  const [selectedDevId, setSelectedDevId] = useState("");
  const [pmNotes, setPmNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectError, setRejectError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isHumanError, setIsHumanError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // System Transfer States
  const [systems, setSystems] = useState<SystemTypeItem[]>([]);
  const [userRole, setUserRole] = useState("PM");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferSystemId, setTransferSystemId] = useState("");
  const [transferChoiceId, setTransferChoiceId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadData = async () => {
    try {
      const [res, sysRes] = await Promise.all([
        fetch("/api/pm-workplace"),
        fetch("/api/systems"),
      ]);
      const json = await res.json();
      setTickets(json.tickets || []);
      setMyDevs(json.myDevelopers || json.devs || []);
      setUserRole(json.userRole || "PM");

      if (sysRes.ok) {
        const sysJson = await sysRes.json();
        setSystems(sysJson.systems || json.systems || []);
      } else {
        setSystems(json.systems || []);
      }
    } catch {
      console.error("Failed to load PM tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleHumanError = async (checked: boolean | "indeterminate") => {
    if (!selectedTicket) return;
    const nextVal = Boolean(checked);
    setIsHumanError(nextVal);
    setSelectedTicket((prev) => (prev ? { ...prev, is_human_error: nextVal } : null));
    setTickets((prev) =>
      prev.map((item) =>
        item.id === selectedTicket.id ? { ...item, is_human_error: nextVal } : item
      )
    );

    try {
      await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHumanError: nextVal }),
      });
    } catch (err) {
      console.error("Failed to update human error tag:", err);
    }
  };

  const handleUpdateStatus = async (status: string, devId?: string, overrideReason?: string) => {
    if (!selectedTicket) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const finalRejectionReason = overrideReason !== undefined ? overrideReason : rejectionReason;
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority: selectedPriority,
          pmNotes,
          rejectionReason: finalRejectionReason,
          assignedDevId: devId || selectedDevId || null,
          isHumanError,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update ticket");
      }
      setSelectedTicket(null);
      setPmNotes("");
      setRejectionReason("");
      setSelectedDevId("");
      setIsHumanError(false);
      setRejectError(false);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to update ticket status");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openRejectDialog = () => {
    setActionError(null);
    setRejectError(false);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setRejectError(true);
      return;
    }
    setRejectError(false);
    setIsRejectDialogOpen(false);
    handleUpdateStatus("REJECTED", undefined, rejectionReason);
  };

  const transferActiveSystem = systems.find((s) => s.id === transferSystemId);
  const transferAvailableChoices = transferActiveSystem?.system_choices || [];

  const openTransferDialog = async () => {
    if (!selectedTicket) return;
    if (systems.length === 0) {
      try {
        const sysRes = await fetch("/api/systems");
        if (sysRes.ok) {
          const sysJson = await sysRes.json();
          if (sysJson.systems) setSystems(sysJson.systems);
        }
      } catch (e) {
        console.error("Failed to load systems", e);
      }
    }
    setTransferSystemId(selectedTicket.system_type_id || "");
    setTransferChoiceId(selectedTicket.choice_id || "");
    setTransferReason("");
    setTransferError(null);
    setIsTransferDialogOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTicket || !transferSystemId) {
      setTransferError("Please select a target system.");
      return;
    }

    if (
      transferSystemId === selectedTicket.system_type_id &&
      transferChoiceId === (selectedTicket.choice_id || "")
    ) {
      setTransferError("Please select a different system or category to transfer.");
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemTypeId: transferSystemId,
          choiceId: transferChoiceId || null,
          transferReason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to transfer ticket.");
      }

      setIsTransferDialogOpen(false);
      setSelectedTicket(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransferError(err.message);
      } else {
        setTransferError("Failed to transfer ticket.");
      }
    } finally {
      setTransferring(false);
    }
  };

  const getPriorityBadge = (p?: string | null) => {
    if (!p) {
      return (
        <Badge variant="outline" className="border-dashed border-border text-muted-foreground text-[10px]">
          No Priority Set
        </Badge>
      );
    }
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
      case "OPEN":
        return <Badge variant="outline" className="border-blue-500 text-blue-500 text-[10px]">Open</Badge>;
      case "CONFIRMED_BUG":
        return <Badge variant="outline" className="border-purple-500 text-purple-500 text-[10px]">Confirmed Bug</Badge>;
      case "IN_DEVELOPMENT":
        return <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px]">In Dev</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-[10px]">Resolved</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="border-destructive text-destructive text-[10px]">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.system_types?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">PM Ticket Backlog & Triage</h2>
        <p className="text-sm text-muted-foreground">
          Review, verify bugs, and assign tickets to your dedicated team of developers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search tickets by #, title, system, or client..."
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
            <option value="OPEN">Open (New)</option>
            <option value="CONFIRMED_BUG">Confirmed Bug</option>
            <option value="IN_DEVELOPMENT">In Development</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:h-[calc(100vh-15.5rem)] lg:min-h-[600px] lg:max-h-[820px]">
        {/* Tickets Backlog */}
        <div className="lg:col-span-7 h-full min-h-0 flex flex-col">
          <Card className="border-border shadow-xs h-full flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/70 shrink-0">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Incoming Tickets ({filteredTickets.length})</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Filtered by PM assigned category
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading backlog...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <Inbox className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No tickets found matching your filter criteria.</p>
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
                          setSelectedPriority(t.priority || "MEDIUM");
                          setPmNotes(t.pm_notes || "");
                          setSelectedDevId(t.assigned_dev_id || "");
                          setIsHumanError(Boolean(t.is_human_error));
                          setRejectionReason(t.rejection_reason || "");
                          setRejectError(false);
                          setActionError(null);
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

                        <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t border-border/60">
                          <div className="flex items-center gap-1">
                            <Layers className="size-3 text-primary" />
                            <span>{t.system_types?.name}</span>
                          </div>
                          <span>Client: {t.profiles?.full_name || "Client"}</span>
                        </div>
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

        {/* Action Panel */}
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
                    {(userRole === "PM" || userRole === "ADMIN") && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={openTransferDialog}
                        className="text-xs hover:border-primary/60"
                        title="Transfer Ticket to another System / Category"
                      >
                        <ArrowRightLeft className="size-3 mr-1 text-primary" />
                        Transfer
                      </Button>
                    )}
                    <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/tickets/${selectedTicket.id}`} />}>
                      <MessageSquare className="size-3 mr-1" />
                      Chat
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-base mt-1">{selectedTicket.title}</CardTitle>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <CardDescription className="text-xs">
                    System: <strong className="text-foreground">{selectedTicket.system_types?.name || "None"}</strong> &bull; Client: {selectedTicket.profiles?.full_name || "Client"}
                  </CardDescription>
                  {(userRole === "PM" || userRole === "ADMIN") && (
                    <button
                      type="button"
                      onClick={openTransferDialog}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <ArrowRightLeft className="size-3" />
                      Transfer System
                    </button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                {actionError && (
                  <Alert variant="destructive" className="py-2.5 text-xs">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                )}

                {/* Contextual Status Banner */}
                {selectedTicket.status === "OPEN" && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                    <Inbox className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">New Ticket Submitted:</span> Verify the issue, set priority, and click &quot;Confirm Bug&quot; before assigning to a developer.
                    </div>
                  </div>
                )}

                {selectedTicket.status === "CONFIRMED_BUG" && (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Bug Confirmed:</span> Ready to assign. Select an engineer below to dispatch this ticket for development.
                    </div>
                  </div>
                )}

                {selectedTicket.status === "IN_DEVELOPMENT" && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">In Development:</span> Assigned to{" "}
                      <span className="font-bold underline">
                        {selectedTicket.dev?.full_name || "Assigned Developer"}
                      </span>
                      {selectedTicket.dev?.email ? ` (${selectedTicket.dev.email})` : ""}. Work is in progress.
                    </div>
                  </div>
                )}

                {selectedTicket.status === "RESOLVED" && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Resolved Issue:</span> Engineering marked this ticket complete. You may reopen if testing fails.
                    </div>
                  </div>
                )}

                {selectedTicket.status === "REJECTED" && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
                    <XCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Ticket Rejected:</span> {selectedTicket.rejection_reason || "Marked as duplicate or invalid."}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Client Reported Issue</Label>
                  <p className="mt-1 text-xs bg-muted/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed break-words">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Human Error Tagging Checkbox */}
                <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 transition-colors hover:bg-muted/40">
                  <Checkbox
                    id="pm-human-error"
                    checked={isHumanError}
                    onCheckedChange={handleToggleHumanError}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="pm-human-error" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      Human Error
                      {isHumanError && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Tagged
                        </Badge>
                      )}
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Check if this ticket was caused by human error or operational mistake. (Visible to Dev, PM, and Admin only)
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pm-priority" className="text-xs font-semibold">
                    Set Severity / Priority Level
                  </Label>
                  <select
                    id="pm-priority"
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                  >
                    <option value="LOW">Low - General inquiry or cosmetic improvement</option>
                    <option value="MEDIUM">Medium - Normal workflow affected</option>
                    <option value="HIGH">High - Major feature blocking work</option>
                    <option value="URGENT">Urgent - System down / Critical blocker</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="assign-dev"
                      className={cn("text-xs font-semibold", selectedTicket.status === "OPEN" && "text-muted-foreground")}
                    >
                      {selectedTicket.status === "IN_DEVELOPMENT"
                        ? "Assigned Developer (Change to Reassign)"
                        : "Assign / Dispatch to Developer"}
                    </Label>
                    {selectedTicket.status !== "OPEN" && (
                      <Link
                        href="/pm-workplace?tab=my-devs"
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        Manage Team &rarr;
                      </Link>
                    )}
                  </div>
                  {selectedTicket.status === "OPEN" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      <span>Confirm bug first before assigning a developer. Accessible once status is <strong>Confirmed Bug</strong>.</span>
                    </div>
                  ) : (
                    <>
                      <select
                        id="assign-dev"
                        className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        value={selectedDevId}
                        onChange={(e) => setSelectedDevId(e.target.value)}
                      >
                        <option value="">-- Choose from My Developers --</option>
                        {myDevs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.full_name} ({d.email})
                          </option>
                        ))}
                      </select>
                      {myDevs.length === 0 && (
                        <p className="text-[11px] text-amber-500 pt-0.5">
                          No developers assigned yet. Go to &quot;My Developers&quot; to build your roster.
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pm-notes" className="text-xs font-semibold">
                    PM Verification Notes / Context for Dev
                  </Label>
                  <Textarea
                    id="pm-notes"
                    placeholder="Enter instructions, logs, reproduction steps..."
                    rows={3}
                    className="text-xs"
                    value={pmNotes}
                    onChange={(e) => setPmNotes(e.target.value)}
                  />
                </div>

                {selectedTicket.status !== "RESOLVED" && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="reject-reason"
                      className={cn(
                        "text-xs font-semibold text-muted-foreground",
                        rejectError && !rejectionReason.trim() && "text-destructive"
                      )}
                    >
                      Rejection Reason (If rejecting ticket)
                    </Label>
                    <Input
                      id="reject-reason"
                      placeholder="e.g. Working as intended / Insufficient details"
                      className={cn(
                        "text-xs transition-colors",
                        rejectError && !rejectionReason.trim() && "border-destructive focus-visible:ring-destructive focus-visible:border-destructive"
                      )}
                      value={rejectionReason}
                      onChange={(e) => {
                        setRejectionReason(e.target.value);
                        if (e.target.value.trim()) setRejectError(false);
                      }}
                    />
                    {rejectError && !rejectionReason.trim() && (
                      <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        Please enter a rejection reason first.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="shrink-0 flex flex-col gap-2 border-t border-border p-4 bg-muted/20">
                {/* 1. When ticket is newly OPEN */}
                {selectedTicket.status === "OPEN" && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus("CONFIRMED_BUG")}
                    >
                      <CheckCircle2 className="size-3.5 mr-1" />
                      Confirm Bug
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={submitting}
                      onClick={openRejectDialog}
                    >
                      <XCircle className="size-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* 2. When Bug is CONFIRMED */}
                {selectedTicket.status === "CONFIRMED_BUG" && (
                  <>
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={submitting || !selectedDevId}
                      onClick={() => handleUpdateStatus("IN_DEVELOPMENT", selectedDevId)}
                    >
                      <UserCheck className="size-3.5 mr-1" />
                      Assign & Dispatch to Dev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:bg-destructive/10"
                      disabled={submitting}
                      onClick={openRejectDialog}
                    >
                      <XCircle className="size-3.5 mr-1" />
                      Reject Ticket
                    </Button>
                  </>
                )}

                {/* 3. When ticket is IN_DEVELOPMENT */}
                {selectedTicket.status === "IN_DEVELOPMENT" && (
                  <div className="flex flex-col gap-2 w-full">
                    {selectedDevId && selectedDevId !== selectedTicket.assigned_dev_id && (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={submitting}
                        onClick={() => handleUpdateStatus("IN_DEVELOPMENT", selectedDevId)}
                      >
                        <UserCheck className="size-3.5 mr-1" />
                        Reassign to Selected Developer
                      </Button>
                    )}

                    {(pmNotes !== (selectedTicket.pm_notes || "") || selectedPriority !== (selectedTicket.priority || "MEDIUM")) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={submitting}
                        onClick={() => handleUpdateStatus("IN_DEVELOPMENT", selectedDevId || selectedTicket.assigned_dev_id)}
                      >
                        <CheckCircle2 className="size-3.5 mr-1 text-primary" />
                        Save Updated Notes & Priority
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/tickets/${selectedTicket.id}`} />}
                        className="w-full"
                      >
                        <MessageSquare className="size-3.5 mr-1 text-primary" />
                        Chat Thread
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:bg-destructive/10"
                        disabled={submitting}
                        onClick={openRejectDialog}
                      >
                        <XCircle className="size-3.5 mr-1" />
                        Reject / Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4. When ticket is RESOLVED */}
                {selectedTicket.status === "RESOLVED" && (
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus("IN_DEVELOPMENT")}
                    >
                      <RefreshCw className="size-3.5 mr-1" />
                      Reopen Ticket (Move back to In Dev)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/tickets/${selectedTicket.id}`} />}
                      className="w-full"
                    >
                      <MessageSquare className="size-3.5 mr-1 text-primary" />
                      Open Chat Thread
                    </Button>
                  </div>
                )}

                {/* 5. When ticket is REJECTED */}
                {selectedTicket.status === "REJECTED" && (
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-primary hover:bg-primary/10"
                      disabled={submitting}
                      onClick={() => handleUpdateStatus("OPEN")}
                    >
                      <RefreshCw className="size-3.5 mr-1" />
                      Reopen Ticket for Triage
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/tickets/${selectedTicket.id}`} />}
                      className="w-full"
                    >
                      <MessageSquare className="size-3.5 mr-1 text-primary" />
                      Open Chat Thread
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-dashed border-border p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center min-h-[350px]">
              <Inbox className="size-10 mx-auto mb-3 opacity-30" />
              <h3 className="font-semibold text-sm text-foreground">No Ticket Selected</h3>
              <p className="text-xs mt-1 max-w-xs">
                Select a ticket from the backlog to triage, confirm bug, or forward to engineering.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Rejection Confirmation Modal */}
      <Dialog
        open={isRejectDialogOpen}
        onOpenChange={(open) => {
          setIsRejectDialogOpen(open);
          if (!open) {
            setRejectError(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5 text-destructive" />
              Reject Ticket {selectedTicket?.ticket_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please provide a reason for rejecting this ticket. This reason will be logged and visible to the reporter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label
              htmlFor="modal-reject-reason"
              className={cn("text-xs font-semibold", rejectError && !rejectionReason.trim() && "text-destructive")}
            >
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="modal-reject-reason"
              placeholder="e.g. Working as intended, duplicate ticket, or insufficient reproduction details..."
              rows={3}
              className={cn(
                "text-xs transition-colors",
                rejectError && !rejectionReason.trim() && "border-destructive focus-visible:ring-destructive focus-visible:border-destructive"
              )}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (e.target.value.trim()) {
                  setRejectError(false);
                }
              }}
            />
            {rejectError && !rejectionReason.trim() && (
              <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="size-3" />
                Please enter a rejection reason first.
              </p>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectError(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submitting}
              onClick={handleConfirmReject}
            >
              {submitting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer System / Category Modal */}
      <Dialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => {
          setIsTransferDialogOpen(open);
          if (!open) setTransferError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ArrowRightLeft className="size-5 text-primary" />
              Transfer Ticket {selectedTicket?.ticket_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reassign this ticket to a different system or category if the client reported under the wrong platform.
            </DialogDescription>
          </DialogHeader>

          {transferError && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertCircle className="size-4" />
              <AlertDescription>{transferError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3.5 py-1 text-xs">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 flex items-center justify-between">
              <span className="text-muted-foreground">Current System:</span>
              <Badge variant="outline" className="font-semibold text-foreground">
                {selectedTicket?.system_types?.name || "None"}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-system" className="text-xs font-semibold">
                New Target System <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                id="transfer-system"
                options={systems.map((s) => ({
                  value: s.id,
                  label: s.name,
                  description: s.description || undefined,
                }))}
                value={transferSystemId}
                onChange={(val) => {
                  setTransferSystemId(val);
                  setTransferChoiceId("");
                  setTransferError(null);
                }}
                placeholder="-- Select Target System --"
                searchPlaceholder="Search system platform..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-category" className="text-xs font-semibold">
                Issue Category <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
              </Label>
              <SearchableSelect
                id="transfer-category"
                options={transferAvailableChoices.map((c) => ({
                  value: c.id,
                  label: c.label,
                  description: c.description || undefined,
                }))}
                value={transferChoiceId}
                onChange={(val) => setTransferChoiceId(val)}
                placeholder="-- Select Category --"
                searchPlaceholder="Search issue category..."
                disabled={!transferSystemId || transferAvailableChoices.length === 0}
                emptyMessage={!transferSystemId ? "Choose a Target System first" : "No categories for this system."}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-reason" className="text-xs font-semibold">
                Transfer Note / Reason <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="transfer-reason"
                placeholder="e.g. Client reported under CRM instead of Mobile App"
                rows={2}
                className="text-xs"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                A system notice will be added to the chat thread and the ticket will be moved to the new system backlog.
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTransferDialogOpen(false);
                setTransferError(null);
              }}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={transferring || !transferSystemId}
              onClick={handleConfirmTransfer}
            >
              {transferring ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="size-3.5 mr-1.5" />
                  Confirm Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

