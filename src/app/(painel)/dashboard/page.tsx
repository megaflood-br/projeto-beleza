import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { calendarDate } from "@/lib/dates";
import {
  averageTicket,
  buildDashboardMetrics,
  defaultDashboardRange,
  previousPeriod,
  rangeBounds,
} from "@/lib/dashboard";
import { DashboardBoard } from "@/components/painel/dashboard-board";

function parseRange(fromRaw?: string, toRaw?: string) {
  const fallback = defaultDashboardRange();
  const from = fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : fallback.from;
  const to = toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : fallback.to;
  return from <= to ? { from, to } : { from: to, to: from };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const { from, to } = parseRange(params.from, params.to);
  const today = calendarDate();
  const current = rangeBounds(from, to);
  const previous = previousPeriod(from, to);
  const prevRange = rangeBounds(previous.from, previous.to);
  const todayRange = rangeBounds(today, today);

  const [income, prevIncome, todayIncome, appointments, prevAppointments, comandas, prevComandas] = await Promise.all([
    prisma.transaction.findMany({
      where: { tenantId: session.tenantId, type: "INCOME", occurredAt: { gte: current.start, lt: current.end } },
      select: { amountCents: true, occurredAt: true },
    }),
    prisma.transaction.aggregate({
      where: { tenantId: session.tenantId, type: "INCOME", occurredAt: { gte: prevRange.start, lt: prevRange.end } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { tenantId: session.tenantId, type: "INCOME", occurredAt: { gte: todayRange.start, lt: todayRange.end } },
      _sum: { amountCents: true },
    }),
    prisma.appointment.findMany({
      where: { tenantId: session.tenantId, startAt: { gte: current.start, lt: current.end } },
      include: { professional: true, items: true },
    }),
    prisma.appointment.count({
      where: { tenantId: session.tenantId, startAt: { gte: prevRange.start, lt: prevRange.end } },
    }),
    prisma.comanda.findMany({
      where: { tenantId: session.tenantId, occurredAt: { gte: current.start, lt: current.end } },
      select: { status: true, occurredAt: true },
    }),
    prisma.comanda.findMany({
      where: { tenantId: session.tenantId, occurredAt: { gte: prevRange.start, lt: prevRange.end } },
      select: { status: true },
    }),
  ]);

  const worked = (status: string) => !["CANCELLED", "NO_SHOW", "PENDING"].includes(status);
  const attendances = appointments.filter((a) => worked(a.status)).flatMap((a) =>
    a.items.map((item) => ({
      date: calendarDate(a.startAt),
      professionalId: a.professionalId,
      professionalName: a.professional.name,
      priceCents: item.priceCents,
    })),
  );
  const prevWorked = await prisma.appointment.findMany({
    where: {
      tenantId: session.tenantId,
      startAt: { gte: prevRange.start, lt: prevRange.end },
      status: { notIn: ["CANCELLED", "NO_SHOW", "PENDING"] },
    },
    include: { items: true },
  });
  const prevAttendances = prevWorked.flatMap((a) => a.items);
  const prevIncomeCents = prevIncome._sum.amountCents ?? 0;
  const prevClosed = prevComandas.filter((c) => c.status === "CLOSED").length;

  const metrics = buildDashboardMetrics({
    from,
    to,
    today,
    income: income.map((row) => ({ date: calendarDate(row.occurredAt), amountCents: row.amountCents })),
    prevIncomeCents,
    todayIncomeCents: todayIncome._sum.amountCents ?? 0,
    appointments: appointments.map((row) => ({ date: calendarDate(row.startAt), status: row.status })),
    prevAppointmentCount: prevAppointments,
    comandas: comandas.map((row) => ({ date: calendarDate(row.occurredAt), status: row.status })),
    prevComandaCount: prevComandas.length,
    attendances,
    prevAttendanceCount: prevAttendances.length,
    prevTicketCents: averageTicket(prevIncomeCents, prevClosed || prevAttendances.length),
  });

  return <DashboardBoard userName={session.name} metrics={metrics} />;
}
