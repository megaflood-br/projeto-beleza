import type { SupplierOrderRow } from "@/components/fornecedor/types";
import { parseSupplierPayMethods } from "@/lib/supplier-market";

type OrderRecord = {
  id: string;
  status: string;
  fulfillment?: string | null;
  paymentMethod?: string | null;
  notes: string | null;
  subtotalCents?: number | null;
  deliveryFeeCents?: number | null;
  totalCents: number;
  pickupCode?: string | null;
  salonAddress?: string | null;
  salonPhone?: string | null;
  pickupAddress?: string | null;
  createdAt: Date;
  receivedAt: Date | null;
  salonTenant: { name: string };
  supplierTenant: { name: string };
  items: {
    id: string;
    name: string;
    brand: string | null;
    quantity: number;
    unit: string;
    unitCents: number;
    lineCents: number;
  }[];
};

export function toSupplierOrderRow(order: OrderRecord): SupplierOrderRow {
  return {
    id: order.id,
    status: order.status,
    fulfillment: order.fulfillment ?? "PICKUP",
    paymentMethod: order.paymentMethod ?? "PIX",
    notes: order.notes,
    subtotalCents: order.subtotalCents ?? order.totalCents,
    deliveryFeeCents: order.deliveryFeeCents ?? 0,
    totalCents: order.totalCents,
    pickupCode: order.pickupCode ?? null,
    salonAddress: order.salonAddress ?? null,
    salonPhone: order.salonPhone ?? null,
    pickupAddress: order.pickupAddress ?? null,
    createdAt: order.createdAt.toISOString(),
    receivedAt: order.receivedAt?.toISOString() ?? null,
    salonName: order.salonTenant.name,
    supplierName: order.supplierTenant.name,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      quantity: item.quantity,
      unit: item.unit,
      unitCents: item.unitCents,
      lineCents: item.lineCents,
    })),
  };
}

export function catalogPayMethods(raw?: string | null) {
  return parseSupplierPayMethods(raw);
}
