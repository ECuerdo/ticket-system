"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldAlert, Sliders } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SystemChoiceItem {
  id: string;
  label: string;
  category: string;
}

interface SystemTypeItem {
  id: string;
  name: string;
  description?: string;
  system_choices?: SystemChoiceItem[];
}

interface UserProfileItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function AdminWorkplaceModule() {
  const [systems, setSystems] = useState<SystemTypeItem[]>([]);
  const [users, setUsers] = useState<UserProfileItem[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Choice states
  const [selectedSysId, setSelectedSysId] = useState("");
  const [choiceCategory, setChoiceCategory] = useState("Module");
  const [choiceLabel, setChoiceLabel] = useState("");
  const [choiceVal, setChoiceVal] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin-workplace");
      const json = await res.json();
      setSystems(json.systems || []);
      setUsers(json.users || []);
      if (json.systems && json.systems.length > 0 && !selectedSysId) {
        setSelectedSysId(json.systems[0].id);
      }
    } catch {
      console.error("Failed to load admin data");
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/admin-workplace");
        const json = await res.json();
        if (!ignore) {
          setSystems(json.systems || []);
          setUsers(json.users || []);
          if (json.systems && json.systems.length > 0) {
            setSelectedSysId(json.systems[0].id);
          }
        }
      } catch {
        console.error("Failed to load admin data");
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error("Failed to add system");
      setName("");
      setDescription("");
      await loadData();
    } catch {
      alert("Failed to add system");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSysId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemTypeId: selectedSysId,
          category: choiceCategory,
          label: choiceLabel,
          value: choiceVal || choiceLabel.toLowerCase().replace(/\s+/g, "-"),
        }),
      });
      if (!res.ok) throw new Error("Failed to add choice");
      setChoiceLabel("");
      setChoiceVal("");
      await loadData();
    } catch {
      alert("Failed to add choice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      await loadData();
    } catch {
      alert("Error updating user role");
    }
  };

  const activeSystem = systems.find((s) => s.id === selectedSysId);
  const choices = activeSystem?.system_choices || [];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Workplace</h1>
        <p className="text-sm text-muted-foreground">
          System-wide settings: Define software systems, manage dropdown choices, and control user roles.
        </p>
      </div>

      {/* Row 1: System Types & Choices */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add System Type */}
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
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sys-name" className="text-xs">System Name</Label>
                <Input
                  id="sys-name"
                  placeholder="e.g. ERP Cloud, Mobile App, POS System"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
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

          {/* List of existing systems */}
          <div className="p-4 border-t border-border/70 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">Existing Systems ({systems.length})</span>
            <div className="divide-y divide-border/60">
              {systems.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold">{s.name}</span>
                    <p className="text-[11px] text-muted-foreground">{s.description || "Active"}</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500 text-[10px]">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Add Dropdown Choices */}
        <Card className="border-border shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              Configure System Choices / Modules
            </CardTitle>
            <CardDescription className="text-xs">
              Dynamic category options that clients select during ticket creation
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAddChoice}>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="choice-sys" className="text-xs">Target System</Label>
                <select
                  id="choice-sys"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none"
                  value={selectedSysId}
                  onChange={(e) => setSelectedSysId(e.target.value)}
                >
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="choice-cat" className="text-xs">Category</Label>
                  <select
                    id="choice-cat"
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none"
                    value={choiceCategory}
                    onChange={(e) => setChoiceCategory(e.target.value)}
                  >
                    <option value="Module">Module</option>
                    <option value="Issue Type">Issue Type</option>
                    <option value="Severity">Severity</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="choice-label" className="text-xs">Label</Label>
                  <Input
                    id="choice-label"
                    placeholder="e.g. Payment Gateway"
                    required
                    value={choiceLabel}
                    onChange={(e) => setChoiceLabel(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/70 pt-3">
              <Button type="submit" size="sm" disabled={submitting}>
                Add Choice
              </Button>
            </CardFooter>
          </form>

          {/* List of choices */}
          <div className="p-4 border-t border-border/70 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Choices for {activeSystem?.name || "System"} ({choices.length})
            </span>
            <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
              {choices.map((c) => (
                <div key={c.id} className="py-1.5 flex items-center justify-between text-xs">
                  <span>{c.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {c.category}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: User Role Permissions */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary" />
            User Roles & Privilege Management ({users.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Switch permissions between CLIENT, PM, DEV, and ADMIN on the fly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="flex h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none"
                    value={u.role}
                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                  >
                    <option value="CLIENT">CLIENT</option>
                    <option value="PM">PROJECT MANAGER (PM)</option>
                    <option value="DEV">DEVELOPER (DEV)</option>
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

