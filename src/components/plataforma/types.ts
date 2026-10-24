import type { TenantStatus } from "@/lib/constants";

export type PlatformPlanOption = {
  slug: string;
  name: string;
  active: boolean;
};

export type TenantAccountRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planLabel: string;
  status: TenantStatus;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  users: number;
  clients: number;
  appointments: number;
  createdAt: string;
  trialEndsAt: string | null;
};
