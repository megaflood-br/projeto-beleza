export function itemLineTotal(item: { quantity: number; priceCents: number; discountCents?: number }) {
  const gross = Math.round(item.quantity * item.priceCents);
  return Math.max(0, gross - Math.max(0, item.discountCents ?? 0));
}

export function comandaSubtotal(items: { quantity: number; priceCents: number; discountCents?: number }[]) {
  return items.reduce((sum, item) => sum + itemLineTotal(item), 0);
}

export function comandaTotal(params: {
  items: { quantity: number; priceCents: number; discountCents?: number }[];
  discountCents?: number;
  creditCents?: number;
  cashbackCents?: number;
}) {
  const subtotal = comandaSubtotal(params.items);
  const discount = Math.max(0, params.discountCents ?? 0);
  const credit = Math.max(0, params.creditCents ?? 0);
  const cashback = Math.max(0, params.cashbackCents ?? 0);
  return Math.max(0, subtotal - discount - credit - cashback);
}

export function paymentChange(totalCents: number, paidCents: number) {
  return Math.max(0, paidCents - totalCents);
}

export function allocatePayments<T extends { amountCents: number }>(totalCents: number, payments: T[]) {
  let remaining = Math.max(0, totalCents);
  return payments.map((payment) => {
    const appliedCents = Math.min(Math.max(0, payment.amountCents), remaining);
    remaining -= appliedCents;
    return { ...payment, appliedCents };
  });
}
