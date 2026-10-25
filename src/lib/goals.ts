import { itemLineTotal } from "@/lib/comandas";
import { eachCalendarDate } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

export const GOAL_METRICS = [
  { id: "REVENUE", label: "Faturamento", unit: "money" as const },
  { id: "SERVICES", label: "Atendimentos", unit: "count" as const },
  { id: "PRODUCTS", label: "Produtos", unit: "money" as const },
  { id: "COMMISSION", label: "Comissão", unit: "money" as const },
  { id: "CLIENTS", label: "Clientes", unit: "count" as const },
] as const;

export type GoalMetric = (typeof GOAL_METRICS)[number]["id"];
export type GoalUnit = (typeof GOAL_METRICS)[number]["unit"];
export type GoalStatus = "hit" | "on_track" | "behind" | "empty";

export type GoalFactItem = {
  professionalId: string | null;
  comandaProfessionalId: string | null;
  comandaId: string;
  clientId: string | null;
  type: string;
  quantity: number;
  priceCents: number;
  discountCents?: number;
};

export type ProfessionalFacts = {
  revenueCents: number;
  productCents: number;
  serviceCount: number;
  clientCount: number;
  comandaCount: number;
  commissionCents: number;
};

export function isGoalMetric(value: string): value is GoalMetric {
  return GOAL_METRICS.some((metric) => metric.id === value);
}

export function goalMetricMeta(metric: string) {
  return GOAL_METRICS.find((item) => item.id === metric) ?? GOAL_METRICS[0];
}

export function attributedProfessional(item: Pick<GoalFactItem, "professionalId" | "comandaProfessionalId">) {
  return item.professionalId || item.comandaProfessionalId || "";
}

export function emptyFacts(): ProfessionalFacts {
  return { revenueCents: 0, productCents: 0, serviceCount: 0, clientCount: 0, comandaCount: 0, commissionCents: 0 };
}

export function professionalFacts(
  items: GoalFactItem[],
  commissions: { professionalId: string; amountCents: number }[],
  professionalId: string,
): ProfessionalFacts {
  const mine = items.filter((item) => attributedProfessional(item) === professionalId);
  const comandas = new Set(mine.map((item) => item.comandaId));
  const clients = new Set(mine.map((item) => item.clientId).filter(Boolean));
  const services = mine.filter((item) => item.type === "SERVICE");
  const products = mine.filter((item) => item.type === "PRODUCT");
  return {
    revenueCents: mine.reduce((sum, item) => sum + itemLineTotal(item), 0),
    productCents: products.reduce((sum, item) => sum + itemLineTotal(item), 0),
    serviceCount: comandas.size,
    clientCount: clients.size,
    comandaCount: comandas.size,
    commissionCents: commissions
      .filter((row) => row.professionalId === professionalId)
      .reduce((sum, row) => sum + row.amountCents, 0),
  };
}

export function currentForMetric(metric: string, facts: ProfessionalFacts) {
  switch (metric) {
    case "PRODUCTS":
      return facts.productCents;
    case "SERVICES":
      return facts.serviceCount;
    case "CLIENTS":
      return facts.clientCount;
    case "COMMISSION":
      return facts.commissionCents;
    default:
      return facts.revenueCents;
  }
}

export function expectedPacePct(from: string, to: string, today: string) {
  const days = eachCalendarDate(from, to);
  if (!days.length) return 0;
  if (today < days[0]) return 0;
  if (today > days[days.length - 1]) return 100;
  const elapsed = days.filter((day) => day <= today).length;
  return Math.round((elapsed / days.length) * 100);
}

export function goalProgress(target: number, current: number, pacePct = 0) {
  const safeTarget = Math.max(0, target);
  const safeCurrent = Math.max(0, current);
  const pct = safeTarget > 0 ? Math.round((safeCurrent / safeTarget) * 100) : 0;
  let status: GoalStatus = "empty";
  if (safeTarget > 0) {
    if (safeCurrent >= safeTarget) status = "hit";
    else if (pct >= pacePct) status = "on_track";
    else status = "behind";
  }
  return {
    current: safeCurrent,
    target: safeTarget,
    remaining: Math.max(0, safeTarget - safeCurrent),
    pct,
    reached: safeTarget > 0 && safeCurrent >= safeTarget,
    status,
  };
}

export function formatGoalValue(metric: string, value: number) {
  const unit = goalMetricMeta(metric).unit;
  if (unit === "money") return formatBRL(value);
  if (metric === "CLIENTS") return `${value} ${value === 1 ? "cliente" : "clientes"}`;
  return `${value} ${value === 1 ? "atendimento" : "atendimentos"}`;
}

export function summarizeGoalStatuses(statuses: GoalStatus[]) {
  return {
    total: statuses.length,
    hit: statuses.filter((status) => status === "hit").length,
    onTrack: statuses.filter((status) => status === "on_track").length,
    behind: statuses.filter((status) => status === "behind").length,
  };
}
