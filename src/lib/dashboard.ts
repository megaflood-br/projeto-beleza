import { calendarDate, eachCalendarDate, shiftCalendarDate, zonedDateTime } from "@/lib/dates";

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function defaultDashboardRange(today = calendarDate()) {
  return { from: shiftCalendarDate(today, -14), to: today };
}

export function previousPeriod(from: string, to: string) {
  const dates = eachCalendarDate(from, to);
  const len = Math.max(1, dates.length);
  const prevTo = shiftCalendarDate(from, -1);
  const prevFrom = shiftCalendarDate(from, -len);
  return { from: prevFrom, to: prevTo };
}

export function rangeBounds(from: string, to: string) {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  return {
    start: zonedDateTime(start, "00:00"),
    end: zonedDateTime(shiftCalendarDate(end, 1), "00:00"),
  };
}

export function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function conversionRate(comandas: number, appointments: number) {
  if (appointments <= 0) return 0;
  return Math.min(100, Math.round((comandas / appointments) * 100));
}

export function averageTicket(revenueCents: number, count: number) {
  if (count <= 0) return 0;
  return Math.round(revenueCents / count);
}

export function bucketAppointmentStatus(status: string): "confirmed" | "cancelled" | "unconfirmed" {
  if (status === "CANCELLED" || status === "NO_SHOW") return "cancelled";
  if (status === "PENDING") return "unconfirmed";
  return "confirmed";
}

export function countByDate(dates: string[], items: { date: string }[]) {
  const map = new Map(dates.map((date) => [date, 0]));
  for (const item of items) {
    map.set(item.date, (map.get(item.date) ?? 0) + 1);
  }
  return dates.map((date) => map.get(date) ?? 0);
}

export function rankProfessionals(
  rows: { professionalId: string; name: string; priceCents: number }[],
) {
  const map = new Map<string, { professionalId: string; name: string; services: number; revenueCents: number }>();
  for (const row of rows) {
    const current = map.get(row.professionalId) ?? {
      professionalId: row.professionalId,
      name: row.name,
      services: 0,
      revenueCents: 0,
    };
    current.services += 1;
    current.revenueCents += row.priceCents;
    map.set(row.professionalId, current);
  }
  return [...map.values()]
    .sort((a, b) => b.services - a.services || b.revenueCents - a.revenueCents)
    .map((row, index) => ({
      ...row,
      avgCents: averageTicket(row.revenueCents, row.services),
      place: index + 1,
    }));
}

export type StatusSlice = { key: string; label: string; value: number; color: string };

export function appointmentStatusSlices(appointments: { status: string }[]): StatusSlice[] {
  const counts = { confirmed: 0, cancelled: 0, unconfirmed: 0 };
  for (const item of appointments) counts[bucketAppointmentStatus(item.status)] += 1;
  return [
    { key: "confirmed", label: "Confirmado", value: counts.confirmed, color: "#10B981" },
    { key: "cancelled", label: "Cancelado", value: counts.cancelled, color: "#EF4444" },
    { key: "unconfirmed", label: "Não confirmado", value: counts.unconfirmed, color: "#3B82F6" },
  ];
}

export function comandaStatusSlices(comandas: { status: string }[]): StatusSlice[] {
  const counts = { OPEN: 0, CLOSED: 0, CANCELLED: 0 };
  for (const item of comandas) {
    if (item.status === "CLOSED") counts.CLOSED += 1;
    else if (item.status === "CANCELLED") counts.CANCELLED += 1;
    else counts.OPEN += 1;
  }
  return [
    { key: "closed", label: "Fechada", value: counts.CLOSED, color: "#10B981" },
    { key: "open", label: "Em aberto", value: counts.OPEN, color: "#8B5CF6" },
    { key: "cancelled", label: "Cancelada", value: counts.CANCELLED, color: "#EF4444" },
  ];
}

export function buildDashboardMetrics(input: {
  from: string;
  to: string;
  today: string;
  income: { date: string; amountCents: number }[];
  prevIncomeCents: number;
  todayIncomeCents: number;
  appointments: { date: string; status: string }[];
  prevAppointmentCount: number;
  comandas: { date: string; status: string }[];
  prevComandaCount: number;
  attendances: { date: string; professionalId: string; professionalName: string; priceCents: number }[];
  prevAttendanceCount: number;
  prevTicketCents: number;
}) {
  const dates = eachCalendarDate(input.from, input.to);
  const salesCents = input.income.reduce((sum, row) => sum + row.amountCents, 0);
  const closedComandas = input.comandas.filter((c) => c.status === "CLOSED").length;
  const ticketCount = closedComandas || input.attendances.length;
  const ticketCurrent = averageTicket(salesCents, ticketCount);
  const appointmentSeries = countByDate(dates, input.appointments);
  const comandaSeries = countByDate(dates, input.comandas);
  const attendanceSeries = countByDate(dates, input.attendances);

  return {
    from: input.from,
    to: input.to,
    today: input.today,
    dates,
    salesCents,
    salesTodayCents: input.todayIncomeCents,
    salesDelta: percentDelta(salesCents, input.prevIncomeCents),
    appointments: input.appointments.length,
    appointmentsDelta: percentDelta(input.appointments.length, input.prevAppointmentCount),
    appointmentSeries,
    comandas: input.comandas.length,
    comandasDelta: percentDelta(input.comandas.length, input.prevComandaCount),
    comandaSeries,
    conversionPct: conversionRate(input.comandas.length, input.appointments.length),
    appointmentStatus: appointmentStatusSlices(input.appointments),
    comandaStatus: comandaStatusSlices(input.comandas),
    ticketCurrent,
    ticketPrevious: input.prevTicketCents,
    ticketDelta: percentDelta(ticketCurrent, input.prevTicketCents),
    attendances: input.attendances.length,
    attendancesDelta: percentDelta(input.attendances.length, input.prevAttendanceCount),
    attendanceSeries,
    ranking: rankProfessionals(
      input.attendances.map((row) => ({
        professionalId: row.professionalId,
        name: row.professionalName,
        priceCents: row.priceCents,
      })),
    ),
  };
}

export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>;
