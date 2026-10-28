import { calendarDate } from "@/lib/dates";
import { parseWeekdays, promotionCoversDate, promoPriceCents } from "@/lib/promotions";
import { orderLineCents } from "@/lib/supplier-market";

export const SUPPLIER_DEAL_TYPES = ["PERCENT", "CENTS", "BUNDLE"] as const;
export type SupplierDealType = (typeof SUPPLIER_DEAL_TYPES)[number];

export type SupplierPromoRule = {
  id: string;
  name: string;
  note: string | null;
  startsOn: string;
  endsOn: string;
  weekdays: number[];
  dealType: SupplierDealType;
  discountValue: number;
  buyQty: number;
  payQty: number;
  active: boolean;
  productIds: string[];
  supplierName?: string;
};

export function asSupplierDealType(value: string): SupplierDealType {
  return SUPPLIER_DEAL_TYPES.includes(value as SupplierDealType) ? (value as SupplierDealType) : "PERCENT";
}

export function bundlePayableQty(quantity: number, buyQty: number, payQty: number) {
  if (buyQty <= 0 || payQty <= 0 || quantity < buyQty) return quantity;
  const packs = Math.floor(quantity / buyQty);
  return packs * payQty + (quantity % buyQty);
}

export function supplierDealLabel(rule: Pick<SupplierPromoRule, "name" | "dealType" | "discountValue" | "buyQty" | "payQty">) {
  if (rule.dealType === "BUNDLE" && rule.buyQty > 0 && rule.payQty > 0) {
    return `${rule.name} · leve ${rule.buyQty} pague ${rule.payQty}`;
  }
  if (rule.dealType === "CENTS") {
    return `${rule.name} · ${((rule.discountValue ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} off`;
  }
  if (rule.dealType === "PERCENT") return `${rule.name} · ${rule.discountValue}% off`;
  return rule.name;
}

export function applySupplierPromo(rules: SupplierPromoRule[], productId: string, listCents: number, quantity: number, dateStr: string) {
  let winner: { rule: SupplierPromoRule; lineCents: number; unitCents: number } | null = null;
  for (const rule of rules) {
    if (!promotionCoversDate(rule, dateStr) || !rule.productIds.includes(productId)) continue;
    let unitCents = listCents;
    let payable = quantity;
    if (rule.dealType === "BUNDLE") {
      payable = bundlePayableQty(quantity, rule.buyQty, rule.payQty);
    } else {
      unitCents = promoPriceCents(listCents, rule.dealType, rule.discountValue);
    }
    const lineCents = orderLineCents(payable, unitCents);
    if (!winner || lineCents < winner.lineCents) winner = { rule, lineCents, unitCents };
  }
  if (!winner) {
    return { lineCents: orderLineCents(quantity, listCents), unitCents: listCents, promoName: null as string | null, label: null as string | null };
  }
  return {
    lineCents: winner.lineCents,
    unitCents: winner.unitCents,
    promoName: winner.rule.name,
    label: supplierDealLabel(winner.rule),
  };
}

export function toSupplierPromoRule(promo: {
  id: string;
  name: string;
  note?: string | null;
  startsOn: Date;
  endsOn: Date;
  weekdays: string;
  dealType: string;
  discountValue: number;
  buyQty: number;
  payQty: number;
  active: boolean;
  items: { productId: string }[];
  tenant?: { name: string };
}): SupplierPromoRule {
  return {
    id: promo.id,
    name: promo.name,
    note: promo.note ?? null,
    startsOn: calendarDate(promo.startsOn),
    endsOn: calendarDate(promo.endsOn),
    weekdays: parseWeekdays(promo.weekdays),
    dealType: asSupplierDealType(promo.dealType),
    discountValue: promo.discountValue,
    buyQty: promo.buyQty,
    payQty: promo.payQty,
    active: promo.active,
    productIds: promo.items.map((item) => item.productId),
    supplierName: promo.tenant?.name,
  };
}

export function activeSupplierPromos(rules: SupplierPromoRule[], dateStr: string) {
  return rules.filter((rule) => promotionCoversDate(rule, dateStr));
}
