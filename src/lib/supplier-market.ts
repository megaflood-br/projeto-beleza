export const TENANT_KINDS = ["SALON", "SUPPLIER", "PLATFORM", "PARTNER"] as const;
export type TenantKind = (typeof TENANT_KINDS)[number];

export const SUPPLIER_ORDER_STATUSES = ["SUBMITTED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];

export const SUPPLIER_FULFILLMENTS = ["PICKUP", "DELIVERY"] as const;
export type SupplierFulfillment = (typeof SUPPLIER_FULFILLMENTS)[number];

export const SUPPLIER_PAY_METHODS = ["PIX", "CASH", "CREDIT", "DEBIT", "TRANSFER"] as const;
export type SupplierPayMethod = (typeof SUPPLIER_PAY_METHODS)[number];

export const SUPPLIER_PAY_METHOD_LABEL: Record<SupplierPayMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT: "Cartão de crédito",
  DEBIT: "Cartão de débito",
  TRANSFER: "Transferência",
};

export const SUPPLIER_FULFILLMENT_LABEL: Record<SupplierFulfillment, string> = {
  PICKUP: "Retirada no fornecedor",
  DELIVERY: "Entrega",
};

export const SUPPLIER_ORDER_STATUS_LABEL: Record<SupplierOrderStatus, string> = {
  SUBMITTED: "Enviado",
  CONFIRMED: "Confirmado",
  SHIPPED: "A caminho",
  DELIVERED: "Concluído",
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

export function asSupplierFulfillment(value: string): SupplierFulfillment | null {
  return SUPPLIER_FULFILLMENTS.includes(value as SupplierFulfillment) ? (value as SupplierFulfillment) : null;
}

export function asSupplierPayMethod(value: string): SupplierPayMethod | null {
  return SUPPLIER_PAY_METHODS.includes(value as SupplierPayMethod) ? (value as SupplierPayMethod) : null;
}

export function parseSupplierPayMethods(raw?: string | null): SupplierPayMethod[] {
  const parsed = String(raw ?? "")
    .split(",")
    .map((item) => asSupplierPayMethod(item.trim()))
    .filter((item): item is SupplierPayMethod => Boolean(item));
  return parsed.length ? parsed : ["PIX", "CASH"];
}

export function serializeSupplierPayMethods(methods: string[]) {
  const valid = methods.map(asSupplierPayMethod).filter((item): item is SupplierPayMethod => Boolean(item));
  return (valid.length ? valid : ["PIX", "CASH"]).join(",");
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

export function quoteSupplierFulfillment(input: {
  subtotalCents: number;
  fulfillment: string;
  deliveryMinCents?: number | null;
  deliveryFeeCents?: number | null;
}) {
  const fulfillment = asSupplierFulfillment(input.fulfillment) ?? "PICKUP";
  const min = Math.max(input.deliveryMinCents ?? 0, 0);
  const fee = Math.max(input.deliveryFeeCents ?? 0, 0);
  if (fulfillment === "DELIVERY") {
    if (input.subtotalCents < min) {
      return {
        ok: false as const,
        fulfillment,
        feeCents: 0,
        totalCents: input.subtotalCents,
        missingCents: min - input.subtotalCents,
        error: `Entrega a partir de ${(min / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      };
    }
    return { ok: true as const, fulfillment, feeCents: fee, totalCents: input.subtotalCents + fee, missingCents: 0 };
  }
  return { ok: true as const, fulfillment, feeCents: 0, totalCents: input.subtotalCents, missingCents: 0 };
}

export function supplierOrderStatusLabel(status: string, fulfillment?: string | null) {
  if (status === "SHIPPED" && fulfillment === "PICKUP") return "Pronto para retirada";
  if (status === "SHIPPED") return "Saiu para entrega";
  if (status === "DELIVERED" && fulfillment === "PICKUP") return "Retirado";
  if (status === "DELIVERED") return "Entregue";
  return SUPPLIER_ORDER_STATUS_LABEL[status as SupplierOrderStatus] ?? status;
}

export function makeSupplierOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)] ?? "X";
  }
  return code;
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

export function canChangeSupplierOrder(from: string, to: string, actor: "salon" | "supplier") {
  const current = asSupplierOrderStatus(from);
  const next = asSupplierOrderStatus(to);
  if (!current || !next || current === next) return false;
  return TRANSITIONS[actor][current]?.includes(next) ?? false;
}

export function canReceiveSupplierOrder(status: string, receivedAt?: Date | string | null) {
  return (status === "SHIPPED" || status === "DELIVERED") && !receivedAt;
}
