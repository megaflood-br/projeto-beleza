export type CommissionRow = {
  id: string;
  date: string;
  professionalId: string;
  professionalName: string;
  clientName: string;
  clientId: string | null;
  refLabel: string | null;
  refHref: string | null;
  serviceName: string;
  quantity: number;
  extraCostCents: number;
  feeCents: number;
  feePct: number | null;
  percent: number;
  typeLabel: string;
  assistantDiscountCents: number;
  consumedCents: number;
  amountCents: number;
  availableCents: number;
  status: "PENDING" | "PAID";
};

export type CommissionRule = {
  id: string;
  name: string;
  commissionPct: number;
  receivesCommission: boolean;
};
