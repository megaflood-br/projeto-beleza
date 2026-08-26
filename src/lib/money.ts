export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseBRLToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount)) return 0;
  return Math.round(amount * 100);
}
