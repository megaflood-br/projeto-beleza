import { itemLineTotal } from "@/lib/comandas";

export const CASHBACK_TYPES = ["EARN", "REDEEM", "MANUAL", "ADJUST"] as const;
export type CashbackType = (typeof CASHBACK_TYPES)[number];

export const CASHBACK_TYPE_LABEL: Record<CashbackType, string> = {
  EARN: "Acúmulo",
  REDEEM: "Resgate",
  MANUAL: "Lançamento manual",
  ADJUST: "Ajuste",
};

export type CashbackConfig = {
  enabled: boolean;
  earnPct: number;
  useItemPct: boolean;
  onServices: boolean;
  onProducts: boolean;
  minSpendCents: number;
  maxRedeemPct: number;
  expireDays: number;
  centsPerPoint: number;
};

export type CashbackItem = {
  type: string;
  quantity: number;
  priceCents: number;
  discountCents?: number;
  cashbackPct?: number | null;
};

export function defaultCashbackConfig(partial?: Partial<CashbackConfig>): CashbackConfig {
  return {
    enabled: false,
    earnPct: 5,
    useItemPct: true,
    onServices: true,
    onProducts: true,
    minSpendCents: 0,
    maxRedeemPct: 100,
    expireDays: 0,
    centsPerPoint: 100,
    ...partial,
  };
}

export function tenantCashbackConfig(tenant: {
  cashbackEnabled: boolean;
  cashbackEarnPct: number;
  cashbackUseItemPct: boolean;
  cashbackOnServices: boolean;
  cashbackOnProducts: boolean;
  cashbackMinSpendCents: number;
  cashbackMaxRedeemPct: number;
  cashbackExpireDays: number;
  cashbackCentsPerPoint: number;
}): CashbackConfig {
  return defaultCashbackConfig({
    enabled: tenant.cashbackEnabled,
    earnPct: tenant.cashbackEarnPct,
    useItemPct: tenant.cashbackUseItemPct,
    onServices: tenant.cashbackOnServices,
    onProducts: tenant.cashbackOnProducts,
    minSpendCents: tenant.cashbackMinSpendCents,
    maxRedeemPct: tenant.cashbackMaxRedeemPct,
    expireDays: tenant.cashbackExpireDays,
    centsPerPoint: tenant.cashbackCentsPerPoint,
  });
}

export function normalizeCentsPerPoint(value: number) {
  return Math.max(1, Math.round(value || 100));
}

export function centsToPoints(cents: number, centsPerPoint: number) {
  return Math.trunc(cents / normalizeCentsPerPoint(centsPerPoint));
}

export function pointsToCents(points: number, centsPerPoint: number) {
  return Math.round(points * normalizeCentsPerPoint(centsPerPoint));
}

export function itemEarnRate(item: CashbackItem, config: CashbackConfig) {
  const kind = item.type === "PRODUCT" ? "PRODUCT" : "SERVICE";
  if (kind === "SERVICE" && !config.onServices) return 0;
  if (kind === "PRODUCT" && !config.onProducts) return 0;
  if (config.useItemPct && item.cashbackPct != null && Number.isFinite(item.cashbackPct)) {
    return Math.max(0, item.cashbackPct);
  }
  return Math.max(0, config.earnPct);
}

export function eligibleSpendCents(items: CashbackItem[], config: CashbackConfig) {
  return items.reduce((sum, item) => {
    if (itemEarnRate(item, config) <= 0) return sum;
    return sum + itemLineTotal(item);
  }, 0);
}

export function earnCashbackCents(items: CashbackItem[], config: CashbackConfig) {
  if (!config.enabled) return 0;
  const spend = eligibleSpendCents(items, config);
  if (spend < Math.max(0, config.minSpendCents)) return 0;
  return items.reduce((sum, item) => {
    const rate = itemEarnRate(item, config);
    if (rate <= 0) return sum;
    return sum + Math.round((itemLineTotal(item) * rate) / 100);
  }, 0);
}

export function maxRedeemCents(subtotalCents: number, config: CashbackConfig, availableCents: number) {
  const cap = Math.round((Math.max(0, subtotalCents) * Math.min(100, Math.max(0, config.maxRedeemPct))) / 100);
  return Math.max(0, Math.min(availableCents, cap));
}

export function cashbackExpiry(expireDays: number, from = new Date()) {
  if (expireDays <= 0) return null;
  return new Date(from.getTime() + expireDays * 86_400_000);
}
