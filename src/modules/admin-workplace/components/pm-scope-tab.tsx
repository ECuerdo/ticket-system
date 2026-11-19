"use client";

import { useEffect, useState } from "react";
import { UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SystemTypeItem {
  id: string;
  name: string;
}

interface UserProfileItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  assigned_system_type_id?: string | null;
  assigned_system?: {
    id: string;
    name: string;
  } | null;
}

export function PmScopeTab() {
  const [users, setUsers] = useState<UserProfileItem[]>([]);
  const [systems, setSystems] = useState<SystemTypeItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin-workplace");
      const json = await res.json();
      setUsers(json.users || []);
      setSystems(json.systems || []);
    } catch {
      console.error("Failed to load PM users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateAssignedCategory = async (userId: string, systemTypeId: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin-workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          assignedSystemTypeId: systemTypeId === "ALL" ? null : systemTypeId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update assigned category");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error updating assigned category");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter for PM users only (or all users when searching)
  const pmUsers = users.filter((u) => u.role === "PM");
  const filteredPMs = pmUsers.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredPMs.length / rowsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedPMs = filteredPMs.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">PM Scope & Category Assignment</h2>
        <p className="text-sm text-muted-foreground">
          Assign Project Managers to specific system categories so they only view and triage tickets within their assigned scope.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search Project Managers by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs"
          />
        </div>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            Project Managers Scope List ({filteredPMs.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Binding a system to a PM restricts their PM Workplace backlog strictly to tickets belonging to that category
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading Project Managers...</div>
          ) : filteredPMs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {pmUsers.length === 0
                ? "No Project Managers found. Assign user role to 'PM' in User Roles tab."
                : "No matching Project Managers found."}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {paginatedPMs.map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {u.full_name}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                        Project Manager
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>

                    <div className="pt-1 flex items-center gap-1.5 text-xs text-primary font-medium">
                      <span>Currently Assigned:</span>
                      <span className="font-semibold underline">
                        {u.assigned_system?.name || "All Systems (Full Backlog)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:self-center">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Assigned System Category
                    </span>
                    <select
                      className="h-8 min-w-[220px] rounded-lg border border-purple-500/40 bg-purple-500/5 px-2.5 py-1 text-xs outline-none focus-visible:border-ring"
                      value={u.assigned_system_type_id || "ALL"}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleUpdateAssignedCategory(u.id, e.target.value)}
                    >
                      <option value="ALL">All Systems (Full Backlog)</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} Only
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Pagination & Rows footer */}
        {filteredPMs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border/70 text-xs text-muted-foreground bg-muted/10">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground outline-none focus-visible:border-ring"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {filteredPMs.length === 0 ? 0 : startIndex + 1}-
                {Math.min(startIndex + rowsPerPage, filteredPMs.length)} of {filteredPMs.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="mr-2">
                Page {validCurrentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
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
                  return (
                    <Button
                      key={page}
                      variant={page === validCurrentPage ? "default" : "outline"}
                      size="icon"
                      className="size-8 text-xs"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                }
                if (page === validCurrentPage - 2 || page === validCurrentPage + 2) {
                  return (
                    <span key={page} className="px-1 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={validCurrentPage >= totalPages}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

