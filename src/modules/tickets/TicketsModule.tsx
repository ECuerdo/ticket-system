"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  Search,
  Filter,
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
  priority: string;
  status: string;
  created_at: string;
  pm_notes?: string;
  dev_notes?: string;
  rejection_reason?: string;
  system_types?: { name: string };
}

export default function TicketsModule() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

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
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.system_types?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and track all submitted system tickets and issue reports.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/create-ticket" />}>
          <PlusCircle className="size-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, title, or system..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-xs outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CONFIRMED_BUG">Confirmed Bug</option>
            <option value="IN_DEVELOPMENT">In Development</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            All Tickets ({filteredTickets.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Viewing active and historical tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Loading tickets...</p>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <LifeBuoy className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tickets found matching your query.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredTickets.map((t) => (
                <div key={t.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {t.ticket_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        &bull; {t.system_types?.name || "System"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(t.priority)}
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm">{t.title}</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{t.description}</p>

                  {t.pm_notes && (
                    <div className="mt-1 bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 p-2 rounded text-[11px]">
                      <span className="font-semibold">PM Verification:</span> {t.pm_notes}
                    </div>
                  )}

                  {t.dev_notes && (
                    <div className="mt-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200 p-2 rounded text-[11px]">
                      <span className="font-semibold">Dev Resolution:</span> {t.dev_notes}
                    </div>
                  )}

                  {t.rejection_reason && (
                    <div className="mt-1 bg-destructive/10 border border-destructive/20 text-destructive p-2 rounded text-[11px]">
                      <span className="font-semibold">Rejection Note:</span> {t.rejection_reason}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                    <Clock className="size-3" />
                    <span>Logged on {new Date(t.created_at).toLocaleString()}</span>
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

