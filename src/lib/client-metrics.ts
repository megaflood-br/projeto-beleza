import { comandaTotal } from "@/lib/comandas";
import { daysBetween } from "@/lib/dates";

type AppointmentLike = {
  status: string;
  startAt: Date;
  comanda?: { id: string; status: string } | null;
  items: { priceCents: number }[];
};

type ComandaLike = {
  status: string;
  discountCents: number;
  items: { priceCents: number; quantity: number }[];
};

export function buildClientMetrics(input: {
  createdAt: Date;
  creditCents: number;
  cashbackCents: number;
  appointments: AppointmentLike[];
  packages: { remaining: number }[];
  comandas: ComandaLike[];
}) {
  const countable = input.appointments.filter((a) => a.status !== "CANCELLED");
  const completed = input.appointments.filter((a) => a.status === "COMPLETED");
  const dropped = input.appointments.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW");
  const lastVisit = countable[0];
  const daysWithoutVisit = lastVisit ? daysBetween(lastVisit.startAt) : daysBetween(input.createdAt);

  const closedComandas = input.comandas.filter((c) => c.status === "CLOSED");
  const openComandas = input.comandas.filter((c) => c.status === "OPEN");
  const fromComandas = closedComandas.reduce((sum, c) => sum + comandaTotal(c), 0);
  const fromAppointments = completed
    .filter((a) => !a.comanda || a.comanda.status !== "CLOSED")
    .reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.priceCents, 0), 0);

  const visitDates = completed.map((a) => a.startAt.getTime()).sort((a, b) => a - b);
  let returnDays: number | null = null;
  if (visitDates.length >= 2) {
    const gaps = visitDates.slice(1).map((t, i) => t - visitDates[i]);
    returnDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length / 86_400_000);
  } else if (lastVisit) {
    returnDays = daysWithoutVisit;
  }

  const cancelRate =
    input.appointments.length === 0 ? 0 : (dropped.length / input.appointments.length) * 100;

  return {
    daysWithoutVisit,
    neverVisited: !lastVisit,
    revenueCents: fromComandas + fromAppointments,
    debitCents: openComandas.reduce((sum, c) => sum + comandaTotal(c), 0),
    openPackages: input.packages.filter((p) => p.remaining > 0).length,
    creditCents: input.creditCents,
    cashbackCents: input.cashbackCents,
    cancelRate,
    clientDays: daysBetween(input.createdAt),
    returnDays,
    visitCount: completed.length,
  };
}
