import type { PlanInterval } from "@/lib/plans";

export type PlatformPlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  interval: PlanInterval;
  trialDays: number;
  features: string[];
  active: boolean;
  highlighted: boolean;
  isDefault: boolean;
  sortOrder: number;
  accounts: number;
};
