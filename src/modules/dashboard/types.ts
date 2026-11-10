export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
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

