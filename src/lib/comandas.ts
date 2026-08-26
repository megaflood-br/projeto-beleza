export function comandaSubtotal(items: { quantity: number; priceCents: number }[]) {
  return items.reduce((sum, item) => sum + Math.round(item.quantity * item.priceCents), 0);
}

export function comandaTotal(params: {
  items: { quantity: number; priceCents: number }[];
  discountCents?: number;
}) {
  const subtotal = comandaSubtotal(params.items);
  const discount = Math.max(0, params.discountCents ?? 0);
  return Math.max(0, subtotal - discount);
}
