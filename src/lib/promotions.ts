import { calendarDate, zonedDateTime } from "@/lib/dates";

export const WEEKDAYS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
] as const;

export type PromoRule = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  weekdays: number[];
  discountType: "PERCENT" | "CENTS";
  discountValue: number;
  active: boolean;
  items: { type: string; serviceId: string | null; productId: string | null }[];
};

export function parseWeekdays(value: string | null | undefined) {
  const parsed = String(value ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return parsed.length ? [...new Set(parsed)].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6];
}

export function serializeWeekdays(days: number[]) {
  return parseWeekdays(days.join(",")).join(",");
}

export function weekdayFromCalendarDate(dateStr: string) {
  return zonedDateTime(dateStr, "12:00").getDay();
}

export function promoPriceCents(listCents: number, discountType: string, discountValue: number) {
  const list = Math.max(0, listCents);
  if (discountType === "CENTS") return Math.max(0, list - Math.max(0, discountValue));
  const pct = Math.min(100, Math.max(0, discountValue));
  return Math.max(0, Math.round((list * (100 - pct)) / 100));
}

export function promotionCoversDate(promo: Pick<PromoRule, "active" | "startsOn" | "endsOn" | "weekdays">, dateStr: string) {
  if (!promo.active) return false;
  if (dateStr < promo.startsOn || dateStr > promo.endsOn) return false;
  return promo.weekdays.includes(weekdayFromCalendarDate(dateStr));
}

export function promotionCoversItem(
  promo: Pick<PromoRule, "items">,
  type: string,
  itemId: string,
) {
  return promo.items.some((item) => {
    if (type === "SERVICE") return item.type === "SERVICE" && item.serviceId === itemId;
    return item.type === "PRODUCT" && item.productId === itemId;
  });
}

export function bestPromotion(
  promos: PromoRule[],
  dateStr: string,
  type: string,
  itemId: string,
  listCents: number,
) {
  let winner: { promo: PromoRule; priceCents: number } | null = null;
  for (const promo of promos) {
    if (!promotionCoversDate(promo, dateStr) || !promotionCoversItem(promo, type, itemId)) continue;
    const priceCents = promoPriceCents(listCents, promo.discountType, promo.discountValue);
    if (!winner || priceCents < winner.priceCents) winner = { promo, priceCents };
  }
  return winner;
}

export function decorateCatalogItem(
  promos: PromoRule[],
  dateStr: string,
  type: string,
  item: { id: string; name: string; priceCents: number },
) {
  const match = bestPromotion(promos, dateStr, type, item.id, item.priceCents);
  return {
    ...item,
    promoPriceCents: match?.priceCents ?? null,
    promoName: match?.promo.name ?? null,
  };
}

export function applyCatalogPrice(
  promos: PromoRule[],
  dateStr: string,
  type: string,
  itemId: string,
  listCents: number,
  submittedCents?: number,
) {
  const match = bestPromotion(promos, dateStr, type, itemId, listCents);
  if (submittedCents && submittedCents !== listCents && submittedCents !== match?.priceCents) {
    return { priceCents: submittedCents, promotionId: null };
  }
  if (!match) return { priceCents: listCents, promotionId: null };
  return { priceCents: match.priceCents, promotionId: match.promo.id, promoName: match.promo.name };
}

export function weekdayHeat(counts: number[]) {
  const days = WEEKDAYS.map((day, index) => ({
    ...day,
    count: counts[index] ?? 0,
  }));
  const max = Math.max(1, ...days.map((day) => day.count));
  const min = Math.min(...days.map((day) => day.count));
  return days.map((day) => ({
    ...day,
    intensity: day.count / max,
    weak: day.count === min,
  }));
}

export function toPromoRule(promo: {
  id: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  weekdays: string;
  discountType: string;
  discountValue: number;
  active: boolean;
  items: { type: string; serviceId: string | null; productId: string | null }[];
}): PromoRule {
  return {
    id: promo.id,
    name: promo.name,
    startsOn: calendarDate(promo.startsOn),
    endsOn: calendarDate(promo.endsOn),
    weekdays: parseWeekdays(promo.weekdays),
    discountType: promo.discountType === "CENTS" ? "CENTS" : "PERCENT",
    discountValue: promo.discountValue,
    active: promo.active,
    items: promo.items,
  };
}
