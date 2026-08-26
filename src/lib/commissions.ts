export function calculateCommission(params: {
  priceCents: number;
  professionalPct: number;
  servicePct?: number | null;
}) {
  const percent = params.servicePct ?? params.professionalPct;
  const amountCents = Math.round((params.priceCents * percent) / 100);
  return { percent, amountCents };
}

export function sumCommissions(items: { amountCents: number; status: string }[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += item.amountCents;
      if (item.status === "PAID") acc.paid += item.amountCents;
      else acc.pending += item.amountCents;
      return acc;
    },
    { total: 0, paid: 0, pending: 0 },
  );
}

export function consumedProductCents(usages: { quantity: number; costCents: number }[]) {
  return Math.round(usages.reduce((sum, item) => sum + item.quantity * item.costCents, 0));
}

export function availableCommission(params: {
  amountCents: number;
  extraCostCents?: number;
  consumedCents?: number;
  assistantDiscountCents?: number;
  feeCents?: number;
}) {
  return (
    params.amountCents -
    Math.max(0, params.extraCostCents ?? 0) -
    Math.max(0, params.consumedCents ?? 0) -
    Math.max(0, params.assistantDiscountCents ?? 0) -
    Math.max(0, params.feeCents ?? 0)
  );
}
