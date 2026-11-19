"use client";

import { useEffect, useState } from "react";
import { Plus, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
        body: JSON.stringify({ type: "system", name, description }),
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
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.description || "Active"}</p>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] shrink-0">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

