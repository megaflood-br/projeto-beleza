export function nextStock(current: number, type: "IN" | "OUT" | "ADJUST", quantity: number) {
  if (type === "IN") return current + quantity;
  if (type === "OUT") return current - quantity;
  return quantity;
}

export function isLowStock(stock: number, minStock: number) {
  return stock <= minStock;
}

export function stockUnitLabel(unit: string) {
  if (unit === "ml") return "ml";
  if (unit === "g") return "g";
  return "unidade";
}

export function formatStockQty(quantity: number, unit = "un") {
  const value = Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (unit === "un") return `${value} ${quantity === 1 ? "unidade" : "unidades"}`;
  return `${value} ${stockUnitLabel(unit)}`;
}
