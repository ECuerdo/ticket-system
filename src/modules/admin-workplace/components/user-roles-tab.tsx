"use client";

import { useEffect, useState } from "react";
import { Users, Filter, KeyRound, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserProfileItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function UserRolesTab() {
  const [users, setUsers] = useState<UserProfileItem[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Password reset dialog state
  const [resetUser, setResetUser] = useState<UserProfileItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin-workplace");
      const json = await res.json();
      setUsers(json.users || []);
    } catch {
      console.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin-workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update role");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error updating user role");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword.trim()) return;

    setResetting(true);
    setResetError(null);
    setResetSuccess(false);

    try {
      const res = await fetch("/api/admin-workplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reset-password",
          targetUserId: resetUser.id,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setResetSuccess(true);
      setTimeout(() => {
        setResetUser(null);
        setNewPassword("");
        setResetSuccess(false);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">User Roles Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage system privileges, change user roles (CLIENT, PM, DEV, ADMIN), and reset user passwords.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-lg border border-input bg-background px-3 py-1 text-xs outline-none"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="CLIENT">Client</option>
            <option value="PM">Project Manager (PM)</option>
            <option value="DEV">Developer (DEV)</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-primary" />
            User Roles & Privilege Management ({filteredUsers.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Switch permissions and reset passwords across all registered accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No users found.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {paginatedUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {u.full_name}
                      </span>
                      <Badge
                        variant={u.role === "ADMIN" ? "default" : "secondary"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {u.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                    {/* Role selection */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        System Role
                      </span>
                      <select
                        className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring"
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      >
                        <option value="CLIENT">CLIENT</option>
                        <option value="PM">PROJECT MANAGER (PM)</option>
                        <option value="DEV">DEVELOPER (DEV)</option>
                        <option value="ADMIN">ADMINISTRATOR</option>
                      </select>
                    </div>

                    {/* Reset Password Action */}
                    <div className="flex flex-col gap-0.5 sm:self-end">
                      <span className="text-[10px] text-transparent select-none">Action</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setResetUser(u);
                          setNewPassword("");
                          setResetError(null);
                          setResetSuccess(false);
                        }}
                      >
                        <KeyRound className="size-3.5 mr-1 text-primary" />
                        Reset Password
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Pagination & Rows per page */}
        {filteredUsers.length > 0 && (
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
                Showing {filteredUsers.length === 0 ? 0 : startIndex + 1}-
                {Math.min(startIndex + rowsPerPage, filteredUsers.length)} of {filteredUsers.length}
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

      {/* Reset Password Modal */}
      {resetUser && (
        <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4 text-primary" />
                Reset User Password
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set a new password for <span className="font-semibold text-foreground">{resetUser.full_name}</span> ({resetUser.email}).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-pass" className="text-xs font-medium">New Password</Label>
                <Input
                  id="new-pass"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="text-xs"
                />
              </div>

              {resetError && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                  <Check className="size-4" />
                  Password updated successfully!
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetUser(null)}
                  disabled={resetting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={resetting || !newPassword}>
                  {resetting ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
