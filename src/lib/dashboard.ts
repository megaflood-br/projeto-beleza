import { calendarDate, eachCalendarDate, parseHHmm, shiftCalendarDate, tzParts, zonedDateTime } from "@/lib/dates";

export const HEAT_WEEKDAYS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
] as const;

export function weekdayInSalon(date: Date) {
  return zonedDateTime(calendarDate(date), "12:00").getDay();
}

export function hourInSalon(date: Date) {
  return tzParts(date).hour;
}

export function heatHours(openTime: string, closeTime: string) {
  const start = Math.floor(parseHHmm(openTime) / 60);
  const close = parseHHmm(closeTime);
  const end = Math.max(start + 1, Math.ceil(close / 60));
  return Array.from({ length: end - start }, (_, index) => start + index);
}

export function movementEventParts(date: Date) {
  return { weekday: weekdayInSalon(date), hour: hourInSalon(date) };
}

export function buildMovementHeat(
  events: { weekday: number; hour: number }[],
  hours: number[],
) {
  const cols = hours.length ? hours : heatHours("08:00", "20:00");
  const counts = HEAT_WEEKDAYS.map(() => cols.map(() => 0));
  for (const event of events) {
    const column = cols.indexOf(event.hour);
    if (column < 0 || event.weekday < 0 || event.weekday > 6) continue;
    counts[event.weekday][column] += 1;
  }
  const max = Math.max(0, ...counts.flat());
  const days = HEAT_WEEKDAYS.map((day, index) => ({
    ...day,
    total: counts[index].reduce((sum, value) => sum + value, 0),
    hours: cols.map((hour, column) => ({
      hour,
      count: counts[index][column],
      intensity: max ? counts[index][column] / max : 0,
    })),
  }));
  let peak: { weekday: number; hour: number; count: number; label: string } | null = null;
  for (const day of days) {
    for (const cell of day.hours) {
      if (!cell.count) continue;
      if (!peak || cell.count > peak.count) {
        peak = {
          weekday: day.id,
          hour: cell.hour,
          count: cell.count,
          label: `${day.label} ${String(cell.hour).padStart(2, "0")}h`,
        };
      }
    }
  }
  return { hours: cols, days, max, peak, total: events.length };
}

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
  movement?: { weekday: number; hour: number }[];
  openTime?: string;
  closeTime?: string;
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
    movement: buildMovementHeat(input.movement ?? [], heatHours(input.openTime ?? "08:00", input.closeTime ?? "20:00")),
  };
}

export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>;
