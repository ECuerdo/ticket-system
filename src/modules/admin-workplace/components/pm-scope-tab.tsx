"use client";

import React, { useEffect, useState } from "react";
import {
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SystemTypeItem {
  id: string;
  name: string;
  description?: string;
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
  assigned_systems?: {
    id: string;
    name: string;
  }[];
  assigned_system_ids?: string[];
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

  // Manage Scope Modal states
  const [managingPm, setManagingPm] = useState<UserProfileItem | null>(null);
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [savingScopes, setSavingScopes] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

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

  const handleOpenManageScopes = (pm: UserProfileItem) => {
    setManagingPm(pm);
    const existingIds =
      pm.assigned_system_ids ||
      (pm.assigned_systems || []).map((s) => s.id) ||
      (pm.assigned_system_type_id ? [pm.assigned_system_type_id] : []);
    setSelectedScopeIds(existingIds);
    setScopeError(null);
  };

  const handleToggleScopeId = (sysId: string) => {
    setSelectedScopeIds((prev) =>
      prev.includes(sysId) ? prev.filter((id) => id !== sysId) : [...prev, sysId]
    );
  };

  const handleSelectAllScopes = () => {
    setSelectedScopeIds(systems.map((s) => s.id));
  };

  const handleClearAllScopes = () => {
    setSelectedScopeIds([]);
  };

  const handleSaveScopes = async () => {
    if (!managingPm) return;
    setSavingScopes(true);
    setScopeError(null);
    try {
      const res = await fetch("/api/admin-workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: managingPm.id,
          assignedSystemTypeIds: selectedScopeIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update PM scopes");
      }
      setManagingPm(null);
      await loadData();
    } catch (err: any) {
      setScopeError(err.message || "Failed to update PM scopes");
    } finally {
      setSavingScopes(false);
    }
  };

  const handleRemoveSingleScope = async (pm: UserProfileItem, systemIdToRemove: string) => {
    setUpdatingId(pm.id);
    const currentIds =
      pm.assigned_system_ids ||
      (pm.assigned_systems || []).map((s) => s.id) ||
      (pm.assigned_system_type_id ? [pm.assigned_system_type_id] : []);

    const updatedIds = currentIds.filter((id) => id !== systemIdToRemove);

    try {
      const res = await fetch("/api/admin-workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pm.id,
          assignedSystemTypeIds: updatedIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove category scope");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to remove category scope");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickAddScope = async (pm: UserProfileItem, systemIdToAdd: string) => {
    if (!systemIdToAdd) return;
    setUpdatingId(pm.id);

    const currentIds =
      pm.assigned_system_ids ||
      (pm.assigned_systems || []).map((s) => s.id) ||
      (pm.assigned_system_type_id ? [pm.assigned_system_type_id] : []);

    if (currentIds.includes(systemIdToAdd)) {
      setUpdatingId(null);
      return;
    }

    const updatedIds = [...currentIds, systemIdToAdd];

    try {
      const res = await fetch("/api/admin-workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pm.id,
          assignedSystemTypeIds: updatedIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add category scope");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add category scope");
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
          Assign Project Managers to one or multiple system categories (1-to-many) so they only view and triage tickets within their assigned scope.
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
            Binding system categories to a PM restricts their PM Workplace backlog strictly to tickets belonging to those categories
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
              {paginatedPMs.map((u) => {
                const assignedList =
                  u.assigned_systems && u.assigned_systems.length > 0
                    ? u.assigned_systems
                    : u.assigned_system
                    ? [u.assigned_system]
                    : [];

                const assignedIds = new Set(assignedList.map((s) => s.id));
                const availableToAdd = systems.filter((s) => !assignedIds.has(s.id));

                return (
                  <div
                    key={u.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    {/* PM Info & Assigned Badges */}
                    <div className="min-w-0 space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {u.full_name}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                          Project Manager
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>

                      {/* Multiple Assigned Categories Badges */}
                      <div className="pt-0.5 space-y-1.5">
                        <span className="text-xs text-muted-foreground font-medium block">
                          Assigned Scope ({assignedList.length}):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedList.length > 0 ? (
                            assignedList.map((sys) => (
                              <Badge
                                key={sys.id}
                                variant="secondary"
                                className="text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 gap-1.5 py-1 px-2.5 rounded-lg"
                              >
                                <span>{sys.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSingleScope(u, sys.id)}
                                  disabled={updatingId === u.id}
                                  className="text-purple-400 hover:text-destructive transition-colors ml-0.5 rounded-full p-0.5"
                                  title={`Remove ${sys.name}`}
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs border-dashed text-muted-foreground py-1 px-2.5">
                              All Systems (Full Backlog)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Add & Manage Button */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start md:self-center shrink-0">
                      {availableToAdd.length > 0 && (
                        <select
                          className="h-8 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring max-w-[190px]"
                          disabled={updatingId === u.id}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleQuickAddScope(u, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">+ Add System Scope...</option>
                          {availableToAdd.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-purple-500/30 hover:bg-purple-500/10 text-xs font-semibold text-purple-700 dark:text-purple-300"
                        disabled={updatingId === u.id}
                        onClick={() => handleOpenManageScopes(u)}
                      >
                        <Sliders className="size-3.5" />
                        Manage Scope
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredPMs.length)} of {filteredPMs.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={validCurrentPage <= 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-xs">
                {validCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={validCurrentPage >= totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Manage Multi-Category Scope Dialog */}
      <Dialog
        open={!!managingPm}
        onOpenChange={(open) => {
          if (!open) setManagingPm(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="size-4 text-purple-600" />
              Manage Scope & Categories
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign multiple system categories for <strong className="text-foreground">{managingPm?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {scopeError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{scopeError}</span>
            </div>
          )}

          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
              <span>Selected Categories: <strong className="text-foreground">{selectedScopeIds.length} of {systems.length}</strong></span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllScopes}
                  className="text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={handleClearAllScopes}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Checkbox List for all Systems */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-border/50 border border-border/70 rounded-xl">
              {systems.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No system types defined yet.
                </div>
              ) : (
                systems.map((sys) => {
                  const isChecked = selectedScopeIds.includes(sys.id);
                  return (
                    <div
                      key={sys.id}
                      onClick={() => handleToggleScopeId(sys.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? "bg-purple-500/10 dark:bg-purple-500/15" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          id={`scope-${sys.id}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleScopeId(sys.id)}
                        />
                        <div className="min-w-0">
                          <Label
                            htmlFor={`scope-${sys.id}`}
                            className="text-xs font-semibold cursor-pointer block truncate"
                          >
                            {sys.name}
                          </Label>
                          {sys.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 truncate">
                              {sys.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          isChecked
                            ? "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                            : "text-muted-foreground"
                        }`}
                      >
                        {isChecked ? "Assigned" : "Unassigned"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              If no specific categories are assigned, this Project Manager will have full access to view and triage all incoming tickets across all systems.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManagingPm(null)}
              disabled={savingScopes}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSaveScopes}
              disabled={savingScopes}
            >
              {savingScopes && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Save Scopes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
