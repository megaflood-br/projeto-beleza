import type { PartnerStatus } from "@/lib/partners";

export type PartnerAccountRow = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  status: PartnerStatus;
  commissionBps: number;
  brandName: string;
  primary: string;
  referred: number;
  earnedCents: number;
  availableCents: number;
  pixKey: string | null;
};
