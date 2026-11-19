export interface DashboardStats {
  role?: "CLIENT" | "PM" | "DEV" | "ADMIN";
  scopeSystemName?: string | null;
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  urgentTickets?: number;
  totalUsers?: number;
  totalSystems?: number;
  myDevelopersCount?: number;
  recentTickets: Array<{
    id: string;
    ticket_number: string;
    title: string;
    priority: string;
    status: string;
    system_types?: { name: string };
    profiles?: { full_name: string };
  }>;
}

