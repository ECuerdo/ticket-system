"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  Layers,
  Inbox,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PMTicketItem {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  pm_notes?: string;
  rejection_reason?: string;
  assigned_dev_id?: string;
  system_types?: { name: string };
  profiles?: { full_name: string };
}

interface DeveloperItem {
  id: string;
  full_name: string;
  email: string;
}

export default function PMWorkplaceModule() {
  const [tickets, setTickets] = useState<PMTicketItem[]>([]);
  const [devs, setDevs] = useState<DeveloperItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<PMTicketItem | null>(null);
  const [selectedDevId, setSelectedDevId] = useState("");
  const [pmNotes, setPmNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const loadData = async () => {
    try {
      const res = await fetch("/api/pm-workplace");
      const json = await res.json();
      setTickets(json.tickets || []);
      setDevs(json.devs || []);
    } catch {
      console.error("Failed to load PM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/pm-workplace");
        const json = await res.json();
        if (!ignore) {
          setTickets(json.tickets || []);
          setDevs(json.devs || []);
          setLoading(false);
        }
      } catch {
        console.error("Failed to load PM data");
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleUpdateStatus = async (
    status: "CONFIRMED_BUG" | "REJECTED" | "IN_DEVELOPMENT",
    assignedDevId?: string
  ) => {
    if (!selectedTicket) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignedDevId: assignedDevId || selectedDevId || null,
          pmNotes: pmNotes || selectedTicket.pm_notes,
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status.");

      await loadData();
      setSelectedTicket(null);
      setPmNotes("");
      setRejectionReason("");
    } catch {
      alert("Error updating ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="destructive" className="bg-amber-600">High</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Open</Badge>;
      case "CONFIRMED_BUG":
        return <Badge variant="default" className="bg-purple-600">Confirmed Bug</Badge>;
      case "IN_DEVELOPMENT":
        return <Badge variant="secondary">In Dev</Badge>;
      case "RESOLVED":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600">Resolved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === "ALL") return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PM Workplace</h1>
          <p className="text-sm text-muted-foreground">
            Triage incoming client tickets, confirm valid bugs, and assign directly to developers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-xs outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Backlog ({tickets.length})</option>
            <option value="OPEN">Open for Review</option>
            <option value="CONFIRMED_BUG">Confirmed Bugs</option>
            <option value="IN_DEVELOPMENT">Assigned to Dev</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Ticket Backlog */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading PM tickets...</p>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Inbox className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets found in this queue.</p>
            </Card>
          ) : (
            filteredTickets.map((t) => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedTicket?.id === t.id ? "ring-2 ring-primary border-transparent" : ""
                }`}
                onClick={() => {
                  setSelectedTicket(t);
                  setPmNotes(t.pm_notes || "");
                  setSelectedDevId(t.assigned_dev_id || "");
                }}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                      {t.ticket_number}
                    </span>
                    <div className="flex items-center gap-1.5">
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
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-5">
          {selectedTicket ? (
            <Card className="sticky top-20 border-border shadow-md">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {selectedTicket.ticket_number}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <CardTitle className="text-base mt-1">{selectedTicket.title}</CardTitle>
                <CardDescription className="text-xs">
                  System: {selectedTicket.system_types?.name} &bull; Client: {selectedTicket.profiles?.full_name || "Client"}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Client Reported Issue</Label>
                  <p className="mt-1 text-xs bg-muted/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assign-dev" className="text-xs font-semibold">
                    Assign / Dispatch to Developer
                  </Label>
                  <select
                    id="assign-dev"
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={selectedDevId}
                    onChange={(e) => setSelectedDevId(e.target.value)}
                  >
                    <option value="">-- Choose Developer --</option>
                    {devs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pm-notes" className="text-xs font-semibold">
                    PM Verification Notes / Context for Dev
                  </Label>
                  <Textarea
                    id="pm-notes"
                    rows={3}
                    className="text-xs"
                    placeholder="Instructions on reproduction, impact, or required fix..."
                    value={pmNotes}
                    onChange={(e) => setPmNotes(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rejection" className="text-xs text-muted-foreground">
                    Rejection Reason (If invalid)
                  </Label>
                  <Input
                    id="rejection"
                    className="text-xs"
                    placeholder="Reason for rejecting ticket..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2 border-t border-border p-4 bg-muted/20">
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
                    onClick={() => handleUpdateStatus("REJECTED")}
                  >
                    <XCircle className="size-3.5 mr-1" />
                    Reject
                  </Button>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  disabled={submitting || !selectedDevId}
                  onClick={() => handleUpdateStatus("IN_DEVELOPMENT", selectedDevId)}
                >
                  <UserCheck className="size-3.5 mr-1" />
                  Assign & Dispatch to Dev
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              <p className="text-xs">
                Select a ticket from the backlog to triage, confirm bug, or forward to engineering.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

