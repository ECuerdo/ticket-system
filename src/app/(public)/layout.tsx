import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TicketFlow | Modern Support & Issue Tracking System",
  description: "High-performance ticket management system powered by Next.js and Supabase.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}

