"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Code2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeveloperItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function MyDevelopersTab() {
  const [myDevs, setMyDevs] = useState<DeveloperItem[]>([]);
  const [allDevs, setAllDevs] = useState<DeveloperItem[]>([]);
  const [selectedDevToAdd, setSelectedDevToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadData = async () => {
    try {
      const res = await fetch("/api/pm-workplace");
      const json = await res.json();
      setMyDevs(json.myDevelopers || []);
      setAllDevs(json.allDevelopers || []);
    } catch {
      console.error("Failed to load developers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevToAdd) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/pm-workplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devId: selectedDevToAdd }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add developer");
      }

      setSelectedDevToAdd("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add developer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDeveloper = async (devId: string) => {
    if (!confirm("Are you sure you want to remove this developer from your team roster?")) return;

    setDeletingId(devId);
    try {
      const res = await fetch("/api/pm-workplace", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devId }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to remove developer");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to remove developer");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter developers not yet added to this PM's team
  const availableToAdd = allDevs.filter(
    (dev) => !myDevs.some((m) => m.id === dev.id)
  );

  const filteredMyDevs = myDevs.filter(
    (d) =>
      d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMyDevs.length / rowsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedMyDevs = filteredMyDevs.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">My Developers</h2>
        <p className="text-sm text-muted-foreground">
          Build your development team roster. Assign multiple registered developers to your workplace to triage and dispatch tickets to.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Add Developer Card */}
        <div className="lg:col-span-5">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                Assign Developer to Team
              </CardTitle>
              <CardDescription className="text-xs">
                Select from registered company developers (Role: DEV)
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddDeveloper}>
              <CardContent className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="select-dev" className="text-xs">Select Developer</Label>
                  <select
                    id="select-dev"
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={selectedDevToAdd}
                    onChange={(e) => setSelectedDevToAdd(e.target.value)}
                  >
                    <option value="">-- Choose Registered Developer --</option>
                    {availableToAdd.map((dev) => (
                      <option key={dev.id} value={dev.id}>
                        {dev.full_name} ({dev.email})
                      </option>
                    ))}
                  </select>
                  {availableToAdd.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {allDevs.length === 0
                        ? "No users with role DEV exist yet in the system."
                        : "All registered developers are already added to your team."}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/70 pt-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !selectedDevToAdd}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5 mr-1" />
                      Add to My Developers
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* My Developers List */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="size-4 text-primary" />
                  My Team Roster ({filteredMyDevs.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                These developers appear in your ticket dispatch dropdown for bug assignment
              </CardDescription>
            </CardHeader>

            <div className="p-3 border-b border-border/50">
              <Input
                placeholder="Search my developers..."
                className="text-xs h-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading team...</div>
              ) : filteredMyDevs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {myDevs.length === 0
                    ? "No developers in your team yet. Add one using the form on the left."
                    : "No matching developers found."}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {paginatedMyDevs.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {dev.full_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                            DEV
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{dev.email}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                        disabled={deletingId === dev.id}
                        onClick={() => handleRemoveDeveloper(dev.id)}
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Pagination & Rows Footer */}
            {filteredMyDevs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border/70 text-xs text-muted-foreground bg-muted/10">
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
                    {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredMyDevs.length)} of {filteredMyDevs.length}
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
      </div>
    </div>
  );
}

