export function nextStock(current: number, type: "IN" | "OUT" | "ADJUST", quantity: number) {
  if (type === "IN") return current + quantity;
  if (type === "OUT") return current - quantity;
  return quantity;
}

export function isLowStock(stock: number, minStock: number) {
  return stock <= minStock;
}
