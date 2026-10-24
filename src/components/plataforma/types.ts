import type { TenantPlan, TenantStatus } from "@/lib/constants";

export type TenantAccountRow = {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
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
