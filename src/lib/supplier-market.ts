export const TENANT_KINDS = ["SALON", "SUPPLIER", "PLATFORM"] as const;
export type TenantKind = (typeof TENANT_KINDS)[number];

export const SUPPLIER_ORDER_STATUSES = ["SUBMITTED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];

export const SUPPLIER_ORDER_STATUS_LABEL: Record<SupplierOrderStatus, string> = {
  SUBMITTED: "Enviado",
  CONFIRMED: "Confirmado",
  SHIPPED: "Enviado pelo fornecedor",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const SUPPLIER_ORDER_STATUS_COLOR: Record<SupplierOrderStatus, string> = {
  SUBMITTED: "#2563EB",
  CONFIRMED: "#0D9488",
  SHIPPED: "#7C3AED",
  DELIVERED: "#059669",
  CANCELLED: "#94A3B8",
};

export function asSupplierOrderStatus(value: string): SupplierOrderStatus | null {
  return SUPPLIER_ORDER_STATUSES.includes(value as SupplierOrderStatus) ? (value as SupplierOrderStatus) : null;
}

export function orderLineCents(quantity: number, unitCents: number) {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCents) || unitCents < 0) return 0;
  return Math.round(quantity * unitCents);
}

export function orderTotalCents(items: { lineCents: number }[]) {
  return items.reduce((sum, item) => sum + item.lineCents, 0);
}

export function parseOrderQty(raw: string, fallback = 1) {
  const value = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value * 100) / 100;
}

const TRANSITIONS: Record<"salon" | "supplier", Partial<Record<SupplierOrderStatus, SupplierOrderStatus[]>>> = {
  salon: {
    SUBMITTED: ["CANCELLED"],
  },
  supplier: {
    SUBMITTED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
  },
};

export function canChangeSupplierOrder(
  from: string,
  to: string,
  actor: "salon" | "supplier",
) {
  const current = asSupplierOrderStatus(from);
  const next = asSupplierOrderStatus(to);
  if (!current || !next || current === next) return false;
  return TRANSITIONS[actor][current]?.includes(next) ?? false;
}

export function canReceiveSupplierOrder(status: string, receivedAt?: Date | string | null) {
  return (status === "SHIPPED" || status === "DELIVERED") && !receivedAt;
}
