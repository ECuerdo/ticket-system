"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DevTicketItem {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  pm_notes?: string;
  dev_notes?: string;
  system_types?: { name: string };
}

export default function DevWorkplaceModule() {
  const [tickets, setTickets] = useState<DevTicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<DevTicketItem | null>(null);
  const [devNotes, setDevNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const loadData = async () => {
    try {
      const res = await fetch("/api/dev-workplace");
      const json = await res.json();
      setTickets(json.tickets || []);
    } catch {
      console.error("Failed to load dev tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/dev-workplace");
        const json = await res.json();
        if (!ignore) {
          setTickets(json.tickets || []);
          setLoading(false);
        }
      } catch {
        console.error("Failed to load dev tasks");
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

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
      setSelectedTicket(null);
      setDevNotes("");
    } catch {
      alert("Error updating status");
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

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === "ALL") return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Developer Workplace</h1>
          <p className="text-sm text-muted-foreground">
            Bugs, incidents, and feature issues assigned specifically to you by Project Managers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-xs outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Assigned ({tickets.length})</option>
            <option value="CONFIRMED_BUG">Confirmed Bug</option>
            <option value="IN_DEVELOPMENT">In Development</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Assigned Bugs List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading assigned tasks...</p>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500 opacity-70" />
              <p className="text-sm">No pending bugs assigned to you right now.</p>
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
                  setDevNotes(t.dev_notes || "");
                }}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {t.ticket_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(t.priority)}
                      <Badge
                        variant={t.status === "RESOLVED" ? "outline" : "default"}
                        className={t.status === "RESOLVED" ? "border-emerald-500 text-emerald-600" : ""}
                      >
                        {t.status}
                      </Badge>
                    </div>
                  </div>

                  <h4 className="font-semibold text-sm">{t.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>

                  {t.pm_notes && (
                    <div className="bg-purple-500/10 border-l-2 border-purple-500 p-2 rounded text-[11px] text-purple-900 dark:text-purple-200">
                      <span className="font-semibold">PM Instructions:</span> {t.pm_notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Work & Resolution Area */}
        <div className="lg:col-span-5">
          {selectedTicket ? (
            <Card className="sticky top-20 border-border shadow-md">
              <CardHeader className="pb-3 border-b border-border">
                <span className="font-mono text-xs font-bold text-primary">
                  {selectedTicket.ticket_number}
                </span>
                <CardTitle className="text-base mt-1">{selectedTicket.title}</CardTitle>
                <CardDescription className="text-xs">
                  System: {selectedTicket.system_types?.name}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Issue Description</Label>
                  <p className="mt-1 text-xs bg-muted/40 p-2.5 rounded-lg whitespace-pre-wrap">
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

              <CardFooter className="flex flex-col gap-2 border-t border-border p-4 bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={submitting}
                  onClick={() => handleResolveTicket("IN_DEVELOPMENT")}
                >
                  <Clock className="size-3.5 mr-1.5" />
                  Mark as In Development
                </Button>
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={submitting}
                  onClick={() => handleResolveTicket("RESOLVED")}
                >
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Mark as Resolved
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground border-dashed">
              <p className="text-xs">
                Select an assigned bug from the left to start working and submit your resolution notes.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

