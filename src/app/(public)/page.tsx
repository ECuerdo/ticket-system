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

export default function PublicLandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Background radial gradient accent */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 h-[750px] w-[950px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px] dark:bg-primary/15" />
        <div className="absolute top-[35%] -right-[15%] h-[550px] w-[550px] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30">
              <LifeBuoy className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold tracking-tight leading-none">
                Ticket<span className="text-primary">Flow</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
                Supabase Edition
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#preview" className="text-muted-foreground transition-colors hover:text-foreground">
              Workflow
            </a>
            <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
              Sign In
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
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
              <span>Built with Supabase Realtime & Auth</span>
            </Badge>

            <h1 className="max-w-4xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Resolution at lightspeed.
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-chart-1 bg-clip-text text-transparent">
                Issue Tracking Made Effortless.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl leading-relaxed">
              Simplify customer support, triage bug tickets, and collaborate in real-time. Built specifically for modern teams with Next.js, Shadcn UI, and Supabase.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:mt-10">
              <Button size="lg" className="h-11 px-6 shadow-md" nativeButton={false} render={<Link href="/login" />}>
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
                <span>Supabase Row Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Instant Ticket Dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Responsive & Accessible UI</span>
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
                  <Button variant="outline" size="sm">
                    Filter View
                  </Button>
                  <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
                    + New Ticket
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="divide-y divide-border/60 p-0">
                {/* Mock Ticket 1 */}
                <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                        High Priority
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">#TCK-1092</span>
                      <h2 className="text-sm font-semibold">Payment Gateway timeout during checkout</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reported by Acme Corp &bull; Assigned to Support Engineering
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>3 mins ago</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      In Progress
                    </Badge>
                  </div>
                </div>

                {/* Mock Ticket 2 */}
                <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                        Feature
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">#TCK-1091</span>
                      <h2 className="text-sm font-semibold">Add batch export functionality for CSV reports</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reported by Beta User &bull; Product Backlog
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>24 mins ago</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Under Review
                    </Badge>
                  </div>
                </div>

                {/* Mock Ticket 3 */}
                <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        Resolved
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">#TCK-1090</span>
                      <h2 className="text-sm font-semibold">User session expired unexpectedly on refresh</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Resolved via Supabase cookie session sync
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      <span>Closed</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Done
                    </Badge>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing 3 of 48 active tickets
                </span>
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Open Ticket Console <ArrowRight className="size-3" />
                </Link>
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
                  <CardTitle className="mt-4 text-base">Supabase Backend</CardTitle>
                  <CardDescription>
                    Powered by PostgreSQL with Row Level Security (RLS) guaranteeing data privacy between departments and tenants.
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
                    Tickets status changes, comments, and assignments update instantly across all active agents without page reloading.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Role-Based Access</CardTitle>
                  <CardDescription>
                    Separate views and permissions for clients, support agents, team leads, and system administrators.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">SLA & Metrics</CardTitle>
                  <CardDescription>
                    Monitor First Response Time (FRT), mean time to resolve (MTTR), and agent performance metrics in real time.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Modern Shadcn Layout</CardTitle>
                  <CardDescription>
                    Consistent design tokens, dark mode compatibility, accessible primitives, and intuitive workflows out of the box.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Lock className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-base">Secure Authentication</CardTitle>
                  <CardDescription>
                    Complete server-side authentication with cookies, refresh token rotation, and safe API route verification.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Architecture & Statistics Section */}
        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">99.9%</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Uptime Reliability</p>
              </div>
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">&lt; 15m</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Avg Resolution Time</p>
              </div>
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">100%</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Shadcn UI Native</p>
              </div>
              <div className="space-y-1">
                <p className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">Supabase</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Managed Database</p>
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
                <AccordionTrigger>How does this Ticket System integrate with Supabase?</AccordionTrigger>
                <AccordionContent>
                  We leverage Supabase Auth for session control and PostgreSQL with Row Level Security (RLS) to manage ticket data, department permissions, and audit logs reliably on both server and client components.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Can different teams or departments have isolated queues?</AccordionTrigger>
                <AccordionContent>
                  Yes. Using Supabase policies and ticket metadata, each ticket can be assigned to designated teams or roles with strict visibility isolation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Is there support for dark and light themes?</AccordionTrigger>
                <AccordionContent>
                  Yes, every element is built using CSS variables in Tailwind CSS and Shadcn UI primitives, providing automatic, fully supported contrast for both dark and light modes.
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
                  Sign in now to access the ticket management console, track pending issues, and respond to your users.
                </p>
                <div className="pt-2">
                  <Button size="lg" className="h-11 px-6 shadow-md" nativeButton={false} render={<Link href="/login" />}>
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
            <span className="font-medium text-foreground">TicketFlow</span>
            <span>&bull; Powered by Next.js & Supabase</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Staff Portal
            </Link>
            <Separator orientation="vertical" className="h-3" />
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <Separator orientation="vertical" className="h-3" />
            <span>&copy; 2026 All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

