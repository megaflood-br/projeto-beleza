import type { SupportCategory, SupportPriority, SupportTicketStatus, SupportCallStatus } from "@/lib/constants";
import type { SupportSide } from "@/lib/support";

export type SupportMessageRow = {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  side: SupportSide | "SYSTEM";
  body: string;
  kind: "TEXT" | "SYSTEM";
  createdAt: string;
};

export type SupportTicketRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  number: number;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportTicketStatus;
  createdByName: string;
  assignedToName: string | null;
  lastMessageAt: string;
  lastPreview: string;
  unread: number;
  createdAt: string;
};

export type SupportCallRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  ticketId: string | null;
  startedById: string;
  startedByName: string;
  startedBySide: SupportSide;
  acceptedByName: string | null;
  status: SupportCallStatus;
  startedAt: string;
};

export type SupportOnlineSalon = {
  tenantId: string;
  name: string;
  slug: string;
  users: { id: string; name: string }[];
};

export type SupportLiveState = {
  side: SupportSide;
  me: { id: string; name: string; role: string; tenantId: string };
  adminOnline: boolean;
  onlineSalons: SupportOnlineSalon[];
  tenants: { id: string; name: string }[];
  ringingCalls: SupportCallRow[];
  activeCalls: SupportCallRow[];
  tickets: SupportTicketRow[];
  ticket: (SupportTicketRow & { messages: SupportMessageRow[] }) | null;
  unread: number;
};
