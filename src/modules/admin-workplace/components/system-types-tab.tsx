"use client";

import React, { useEffect, useState } from "react";
import { Plus, Layers, Pencil, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  active: boolean;
  system_choices?: any[];
}

export function SystemTypesTab() {
  const [systems, setSystems] = useState<SystemTypeItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingSystem, setEditingSystem] = useState<SystemTypeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingSystem, setDeletingSystem] = useState<SystemTypeItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin-workplace");
      const json = await res.json();
      setSystems(json.systems || []);
    } catch {
      console.error("Failed to load systems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin-workplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "system", name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add system");
      }
      setName("");
      setDescription("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add system");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (s: SystemTypeItem) => {
    setEditingSystem(s);
    setEditName(s.name);
    setEditDescription(s.description || "");
    setEditActive(s.active);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSystem || !editName.trim()) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch("/api/admin-workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "system",
          systemId: editingSystem.id,
          name: editName.trim(),
          description: editDescription.trim(),
          active: editActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update system");
      }
      setEditingSystem(null);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update system");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSystem) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin-workplace?type=system&id=${deletingSystem.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete system");
      }
      setDeletingSystem(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete system");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Types</h2>
        <p className="text-sm text-muted-foreground">
          Define software platforms, products, or core systems available for ticket reporting.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Card */}
        <div className="lg:col-span-5">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                Add Target System Type
              </CardTitle>
              <CardDescription className="text-xs">
                Systems and platforms available for client ticket reporting
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddSystem}>
              <CardContent className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="sys-name" className="text-xs">System Name</Label>
                  <Input
                    id="sys-name"
                    placeholder="e.g. ERP Cloud, Mobile App, POS System"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sys-desc" className="text-xs">Description</Label>
                  <Input
                    id="sys-desc"
                    placeholder="Short summary of this system"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/70 pt-3">
                <Button type="submit" size="sm" disabled={submitting}>
                  Save System Type
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Existing Systems List */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Existing Systems ({systems.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Active systems accessible by clients when logging new tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Loading systems...</div>
              ) : systems.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No systems added yet. Create one using the form.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {systems.map((s) => (
                    <div key={s.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          {s.active ? (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] shrink-0">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-border text-muted-foreground bg-muted/30 text-[10px] shrink-0">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description || "No description provided."}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8 rounded-lg hover:bg-muted"
                          onClick={() => handleStartEdit(s)}
                          title="Edit system type"
                        >
                          <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8 rounded-lg border-border text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                          onClick={() => {
                            setDeletingSystem(s);
                            setDeleteError(null);
                          }}
                          title="Delete system type"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit System Dialog */}
      <Dialog open={!!editingSystem} onOpenChange={(open) => { if (!open) setEditingSystem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="size-4 text-primary" />
              Edit System Type
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update platform name, description, and client reporting visibility.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sys-name" className="text-xs font-semibold">System Name</Label>
              <Input
                id="edit-sys-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. ERP Cloud, Mobile App"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sys-desc" className="text-xs font-semibold">Description</Label>
              <Input
                id="edit-sys-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Short summary of this system"
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-sys-active" className="text-xs font-semibold cursor-pointer">
                  Active Platform
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, clients can report tickets for this system.
                </p>
              </div>
              <Switch
                id="edit-sys-active"
                checked={editActive}
                onCheckedChange={setEditActive}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSystem(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingEdit || !editName.trim()}>
                {savingEdit && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete System Dialog */}
      <Dialog open={!!deletingSystem} onOpenChange={(open) => { if (!open) setDeletingSystem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-4" />
              Delete System Type
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <strong className="text-foreground">{deletingSystem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="size-4 shrink-0" />
                <span>Cannot Delete System</span>
              </div>
              <p className="leading-relaxed pl-6">{deleteError}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete the system type and any associated module choices. If tickets are currently filed under this system, deletion will be blocked to preserve historical ticket records.
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingSystem(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete System
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
