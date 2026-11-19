"use client";

import { useEffect, useState } from "react";
import { Sliders, Plus, Filter, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SystemChoiceItem {
  id: string;
  label: string;
  category: string;
  value: string;
  system_type_id?: string | null;
}

interface SystemTypeItem {
  id: string;
  name: string;
  system_choices?: SystemChoiceItem[];
}

export function SystemChoicesTab() {
  const [systems, setSystems] = useState<SystemTypeItem[]>([]);
  const [globalChoices, setGlobalChoices] = useState<SystemChoiceItem[]>([]);
  const [targetScope, setTargetScope] = useState("GLOBAL"); // GLOBAL or system ID
  const [choiceCategory, setChoiceCategory] = useState("General");
  const [choiceLabel, setChoiceLabel] = useState("");
  const [choiceVal, setChoiceVal] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin-workplace");
      const json = await res.json();
      setSystems(json.systems || []);
      setGlobalChoices(json.globalChoices || []);
    } catch {
      console.error("Failed to load systems and choices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choiceLabel.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin-workplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "choice",
          isGlobal: targetScope === "GLOBAL",
          systemTypeId: targetScope === "GLOBAL" ? null : targetScope,
          category: choiceCategory,
          label: choiceLabel.trim(),
          value: choiceVal || choiceLabel.trim().toLowerCase().replace(/\s+/g, "-"),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add category");
      }

      setChoiceLabel("");
      setChoiceVal("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add category");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine which choices to display based on selected target scope
  const activeSystem = systems.find((s) => s.id === targetScope);
  const displayedChoices =
    targetScope === "GLOBAL"
      ? globalChoices
      : activeSystem?.system_choices || globalChoices;

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Choices & Categories</h2>
        <p className="text-sm text-muted-foreground">
          Manage ticket categories available across all systems (Concerns, Revisions, Suggestions) or configure custom options per system.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Add Category Form */}
        <div className="lg:col-span-5">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                Configure Categories
              </CardTitle>
              <CardDescription className="text-xs">
                Add new categories or modules that clients choose when submitting tickets
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddChoice}>
              <CardContent className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="target-scope" className="text-xs font-semibold">
                    Scope / Target System
                  </Label>
                  <select
                    id="target-scope"
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={targetScope}
                    onChange={(e) => setTargetScope(e.target.value)}
                  >
                    <option value="GLOBAL">All Systems (Global Default)</option>
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} Only
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="choice-cat" className="text-xs">Classification</Label>
                    <select
                      id="choice-cat"
                      className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={choiceCategory}
                      onChange={(e) => setChoiceCategory(e.target.value)}
                    >
                      <option value="General">General</option>
                      <option value="Module">Module</option>
                      <option value="Issue Type">Issue Type</option>
                      <option value="Feature">Feature</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="choice-label" className="text-xs">Category Label</Label>
                    <Input
                      id="choice-label"
                      placeholder="e.g. Concerns"
                      required
                      value={choiceLabel}
                      onChange={(e) => setChoiceLabel(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/70 pt-3">
                <Button type="submit" size="sm" disabled={submitting || !choiceLabel.trim()}>
                  <Plus className="size-3.5 mr-1" />
                  Add Category
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Existing Choices List */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="size-4 text-primary" />
                  Categories for {targetScope === "GLOBAL" ? "All Systems (Global)" : activeSystem?.name || "System"} ({displayedChoices.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Options available to clients in the Category dropdown
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Loading categories...</div>
              ) : displayedChoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No categories found.
                </div>
              ) : (
                <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto">
                  {displayedChoices.map((c) => (
                    <div key={c.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{c.label}</span>
                        {c.system_type_id === null && (
                          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 flex items-center gap-1">
                            <Globe className="size-2.5" />
                            Global
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.category}
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
