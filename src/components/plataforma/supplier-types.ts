import type { TenantStatus } from "@/lib/constants";

export type SupplierAccountRow = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  products: number;
  orders: number;
};
