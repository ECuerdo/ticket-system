"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  BarChart3,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { BrandLogo, BrandSubtitle, ProjectName } from "@/components/shared/branding-provider";
import { AuthDialog } from "@/modules/auth/components/auth-dialog";
import { formatDistanceToNow } from "date-fns";

function getRelativeTime(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "recently";
  }
}

interface PublicLandingViewProps {
  randomTickets: any[];
  totalActive: number;
}

export function PublicLandingView({
  randomTickets,
  totalActive,
}: PublicLandingViewProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");

  const openAuth = (tab: "login" | "register" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Background radial gradient accent */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[750px] w-[950px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px] dark:bg-primary/15" />
        <div className="absolute top-[35%] -right-[15%] h-[550px] w-[550px] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <BrandLogo
              className="size-9 rounded-xl ring-0"
              fallback={<LifeBuoy className="size-5" />}
            />
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold tracking-tight leading-tight">
                <ProjectName />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
                <BrandSubtitle variant="landing" />
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#preview" className="text-muted-foreground transition-colors hover:text-foreground">
              Live Stream
            </a>
            <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openAuth("login")}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => openAuth("register")}
            >
              Get Started
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="container mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6">
            <Badge variant="outline" className="mb-6 gap-1.5 py-1 px-3.5 text-xs font-semibold shadow-xs">
              <Sparkles className="size-3.5 text-primary" />
              <span>Unified Multi-Role Issue Tracking</span>
            </Badge>

            <h1 className="max-w-4xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Resolution at lightspeed.
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-chart-1 bg-clip-text text-transparent">
                Issue Tracking Made Effortless.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed">
              Simplify customer support, triage bug tickets, and collaborate in real time. Seamlessly connect clients, project managers, and engineers in one unified communication platform.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:mt-10">
              <Button
                size="lg"
                className="h-11 px-6 shadow-md"
                onClick={() => openAuth("login")}
              >
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 px-6"
                nativeButton={false}
                render={<a href="#features" />}
              >
                Explore Features
              </Button>
            </div>

            {/* Micro Highlights */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground sm:text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>End-to-End Ticket Lifecycle</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Instant Ticket Dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Realtime Thread & Reactions</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Ticket Dashboard Preview / Status Showcase */}
        <section id="preview" className="py-12 md:py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <Card className="border-border/80 shadow-2xl backdrop-blur-sm">
              <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Recent Tickets Stream</CardTitle>
                    <Badge variant="secondary" className="gap-1">
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Feed
                    </Badge>
                  </div>
                  <CardDescription>
                    Realtime incoming tickets synced across agents and clients
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => openAuth("login")}
                  >
                    + New Ticket
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="divide-y divide-border/60 p-0">
                {randomTickets.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No tickets available in stream right now.
                  </div>
                ) : (
                  randomTickets.map((t: any) => {
                    const isResolved = t.status === "RESOLVED";
                    const isUrgent = t.priority === "URGENT" || t.priority === "HIGH";
                    const badgeLabel = t.priority || t.system_name || "ISSUE";

                    return (
                      <div
                        key={t.id}
                        className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                isUrgent
                                  ? "destructive"
                                  : t.priority === "MEDIUM"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px] uppercase font-bold tracking-wider"
                            >
                              {badgeLabel}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground font-semibold">
                              #{t.ticket_number || "TCK"}
                            </span>
                            <h2 className="text-sm font-semibold truncate max-w-md">{t.title}</h2>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            Reported by {t.client_name || "Client"}
                            {t.dev_name && ` • Assigned to ${t.dev_name}`}
                            {t.system_name && ` • ${t.system_name}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {isResolved ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Clock className="size-3.5" />
                            )}
                            <span>{getRelativeTime(t.created_at)}</span>
                          </div>
                          <Badge
                            variant={
                              isResolved
                                ? "secondary"
                                : t.status === "IN_DEVELOPMENT" || t.status === "CONFIRMED_BUG"
                                ? "outline"
                                : "default"
                            }
                            className="text-xs capitalize font-medium"
                          >
                            {t.status?.replace(/_/g, " ").toLowerCase() || "open"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing {randomTickets.length} of {totalActive} active tickets
                </span>
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Open Ticket Console <ArrowRight className="size-3" />
                </button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-14 text-center">
              <Badge variant="outline" className="mb-3">
                Engineered for Reliability
              </Badge>
              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to handle support at scale
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                All components and modules designed for seamless state transitions, fast response times, and automated lifecycle tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Database className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Centralized Issue Tracking</CardTitle>
                  <CardDescription>
                    Log, triage, and organize tickets across multiple business systems and technical categories with complete audit history.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Instant Realtime Updates</CardTitle>
                  <CardDescription>
                    Ticket status changes, comments, and assignments update instantly across all active agents without page reloading.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Role-Based Workplaces</CardTitle>
                  <CardDescription>
                    Tailored workspaces and permissions for Clients, Project Managers, Engineering Developers, and System Administrators.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">SLA & Priority Queues</CardTitle>
                  <CardDescription>
                    Organize by Urgent, High, and Normal priorities with real-time lifecycle tracking to meet service level agreements.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Interactive Support Threads</CardTitle>
                  <CardDescription>
                    Full conversation history with file attachments, emoji reactions, typing indicators, and immediate notification alerts.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Lock className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Confidentiality & Reporting</CardTitle>
                  <CardDescription>
                    Private staff-only discussion notes, protected client incident reports to admins, and strict permission barriers.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">99.9%</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Uptime Reliability</p>
              </div>
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">&lt; 15m</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Avg First Response</p>
              </div>
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">4 Roles</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Unified Workplaces</p>
              </div>
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">24/7</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Incident Monitoring</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 md:py-24">
          <div className="container mx-auto max-w-3xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <Badge variant="outline" className="mb-3">
                Got Questions?
              </Badge>
              <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion defaultValue={["item-1"]} className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do clients submit and track their support tickets?</AccordionTrigger>
                <AccordionContent>
                  Clients can quickly create a ticket by selecting the affected system, category, and priority level, along with optional file or screenshot attachments. Once created, clients can monitor progress in real time and converse directly with assigned staff.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>How are tickets assigned and routed to team members?</AccordionTrigger>
                <AccordionContent>
                  Tickets are routed to Project Managers based on the system category. Project Managers triage the issue, confirm bugs or features, and assign dedicated developers. Developers receive real-time notifications to begin investigation immediately.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Can staff discuss sensitive details without clients seeing?</AccordionTrigger>
                <AccordionContent>
                  Yes. The platform includes an internal staff mode. When a ticket is completed, closed, or flagged for internal review, staff members (Admins, PMs, and Developers) can leave private internal notes and discuss implementation details without exposing them to the client.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>How are incident reports and confidential concerns handled?</AccordionTrigger>
                <AccordionContent>
                  Clients can report problematic threads directly using the Report button inside the chat. To maintain complete confidentiality, incident reports are delivered exclusively to System Administrators, keeping PMs and Developers uninformed of the report.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Does the system support live interactive chat and reactions?</AccordionTrigger>
                <AccordionContent>
                  Yes. Every ticket includes a live interactive thread with instant messaging, typing indicators to show when someone is responding, emoji reactions to acknowledge updates, and automatic notifications across all devices.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-12">
              <div className="relative z-10 mx-auto max-w-2xl space-y-4">
                <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  Ready to upgrade your support workflow?
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Sign in or create an account now to access the ticket management console, track pending issues, and respond to your users.
                </p>
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="h-11 px-6 shadow-md"
                    onClick={() => openAuth("login")}
                  >
                    Enter Ticket Portal
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background py-8 text-xs text-muted-foreground">
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <LifeBuoy className="size-4 text-primary" />
            <span className="font-medium text-foreground"><ProjectName /></span>
            <span>&bull; Intelligent Multi-Role Support Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Staff Portal
            </button>
            <Separator orientation="vertical" className="h-3" />
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <Separator orientation="vertical" className="h-3" />
            <span>&copy; 2026 All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Auth Pop-up Dialog Modal over the Landing Page */}
      <AuthDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab={authModalTab}
      />
    </div>
  );
}
