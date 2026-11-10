export type UserRole = "CLIENT" | "PM" | "DEV" | "ADMIN";

export type TicketStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "CONFIRMED_BUG"
  | "IN_DEVELOPMENT"
  | "RESOLVED"
  | "REJECTED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface SystemType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface SystemChoice {
  id: string;
  systemTypeId: string;
  category: string; // e.g. "Module", "Issue Type", "Severity"
  label: string;
  value: string;
  active: boolean;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  systemTypeId: string;
  systemTypeName?: string;
  category?: string;
  priority: TicketPriority;
  status: TicketStatus;
  clientId: string;
  clientName?: string;
  assignedPmId?: string;
  assignedDevId?: string;
  devNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

