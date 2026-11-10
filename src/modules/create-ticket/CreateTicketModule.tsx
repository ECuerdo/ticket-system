"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Loader2, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SystemChoiceOption {
  id: string;
  category?: string;
  label: string;
}

interface SystemTypeOption {
  id: string;
  name: string;
  system_choices?: SystemChoiceOption[];
}

export default function CreateTicketModule({ userName }: { userName: string }) {
  const router = useRouter();
  const [systems, setSystems] = useState<SystemTypeOption[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [loadingSystems, setLoadingSystems] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSystems() {
      try {
        const res = await fetch("/api/systems");
        const json = await res.json();
        if (json.systems && json.systems.length > 0) {
          setSystems(json.systems);
          setSelectedSystemId(json.systems[0].id);
        }
      } catch {
        setErrorMsg("Failed to load systems from database.");
      } finally {
        setLoadingSystems(false);
      }
    }
    fetchSystems();
  }, []);

  const activeSystem = systems.find((s) => s.id === selectedSystemId);
  const availableChoices = activeSystem?.system_choices || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          systemTypeId: selectedSystemId,
          choiceId: selectedChoiceId || null,
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit ticket.");
      }

      router.push("/tickets");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to create ticket.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Support Ticket</h1>
        <p className="text-sm text-muted-foreground">
          Submit an incident, bug report, or system inquiry directly to our Project Managers.
        </p>
      </div>

      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ticket Details</CardTitle>
          <CardDescription className="text-xs">
            Reporter: <span className="font-semibold text-foreground">{userName}</span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ticket-title" className="text-xs font-medium">Ticket Title / Subject</Label>
              <Input
                id="ticket-title"
                placeholder="e.g. Checkout page returns 502 error upon clicking place order"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="system-type" className="text-xs font-medium">Target System</Label>
                {loadingSystems ? (
                  <div className="text-xs text-muted-foreground py-2">Loading systems...</div>
                ) : (
                  <select
                    id="system-type"
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={selectedSystemId}
                    onChange={(e) => {
                      setSelectedSystemId(e.target.value);
                      setSelectedChoiceId("");
                    }}
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="system-choice" className="text-xs font-medium">Module / Issue Category</Label>
                <select
                  id="system-choice"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={selectedChoiceId}
                  onChange={(e) => setSelectedChoiceId(e.target.value)}
                >
                  <option value="">General Issue</option>
                  {availableChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category ? `[${c.category}] ` : ""}{c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority" className="text-xs font-medium">Severity / Priority</Label>
              <select
                id="priority"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">Low - General inquiry or cosmetic improvement</option>
                <option value="MEDIUM">Medium - Normal workflow affected</option>
                <option value="HIGH">High - Major feature blocking work</option>
                <option value="URGENT">Urgent - System down / Critical blocker</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-desc" className="text-xs font-medium">Description & Reproduction Steps</Label>
              <Textarea
                id="ticket-desc"
                rows={6}
                placeholder="Describe what occurred, steps to recreate, and any console or visual errors..."
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center border-t border-border/70 p-4 bg-muted/20">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="size-3.5" />
              <span>Will be routed to the system PM for triage upon submit</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" type="button" nativeButton={false} render={<Link href="/tickets" />}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5 mr-1.5" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

