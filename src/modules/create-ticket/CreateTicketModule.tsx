"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Info,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";

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

interface AttachedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function CreateTicketModule({ userName }: { userName: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [systems, setSystems] = useState<SystemTypeOption[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState("");
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Attachments state
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingSystems, setLoadingSystems] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  // Handle uploading images or PDF to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const uploaded: AttachedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate type (images and pdf)
        const isAllowed =
          file.type.startsWith("image/") || file.type === "application/pdf";
        if (!isAllowed) {
          throw new Error(`File ${file.name} is not an image or PDF.`);
        }

        // Limit size to 10MB
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds the 10MB limit.`);
        }

        const fileExt = file.name.split(".").pop();
        const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `tickets/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(filePath);

        uploaded.push({
          name: file.name,
          url: publicUrlData.publicUrl,
          size: file.size,
          type: file.type,
        });
      }

      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to upload files.");
      }
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedChoiceId("");
    setAttachments([]);
    if (systems.length > 0) {
      setSelectedSystemId(systems[0].id);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/create-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          systemTypeId: selectedSystemId,
          choiceId: selectedChoiceId || null,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit ticket.");
      }

      // 1. Reset / un-populate all form fields
      resetForm();

      // 2. Feedback and redirect
      setSuccessMsg("Ticket submitted successfully! Redirecting to Tickets...");
      setTimeout(() => {
        router.push("/tickets");
        router.refresh();
      }, 1200);
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
    <div className="w-full space-y-6">
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

            {successMsg && (
              <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-xs">{successMsg}</AlertDescription>
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
                <Label htmlFor="system-choice" className="text-xs font-medium">Issue Category</Label>
                <select
                  id="system-choice"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={selectedChoiceId}
                  onChange={(e) => setSelectedChoiceId(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {availableChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-desc" className="text-xs font-medium">Description & Reproduction Steps</Label>
              <Textarea
                id="ticket-desc"
                rows={5}
                placeholder="Describe what occurred, steps to recreate, and any console or visual errors..."
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* ATTACHMENTS (Images / PDF) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Paperclip className="size-3.5 text-primary" />
                  Attach Screenshots or PDF Documents (Max 10MB each)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                >
                  {uploadingFiles ? (
                    <>
                      <Loader2 className="size-3 animate-spin mr-1" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip className="size-3 mr-1" />
                      Add Files
                    </>
                  )}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />

              {attachments.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  {attachments.map((file, idx) => (
                    <div
                      key={file.url}
                      className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/40 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="size-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="size-4 text-rose-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px] font-medium" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-background"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t border-border/70 p-4 bg-muted/20">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="size-3.5 shrink-0" />
              <span>Will be routed to the system PM for triage upon submit</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={resetForm}
                disabled={loading}
              >
                Clear Form
              </Button>
              <Button size="sm" type="submit" disabled={loading || uploadingFiles}>
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
