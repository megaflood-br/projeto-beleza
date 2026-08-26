import { addDays, addMinutes, format, isSameDay, parseISO, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TZ = "America/Sao_Paulo";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function tzParts(date: Date, timeZone = TZ) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function calendarDate(date: Date = new Date(), timeZone = TZ) {
  const p = tzParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function shiftCalendarDate(dateStr: string, days: number) {
  const next = addDays(parseISO(`${dateStr}T12:00:00Z`), days);
  return next.toISOString().slice(0, 10);
}

/** Instant corresponding to YYYY-MM-DD + HH:mm in the salon timezone. */
export function zonedDateTime(dateStr: string, hhmm: string, timeZone = TZ) {
  const time = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  const utcGuess = new Date(`${dateStr}T${time}Z`);
  const p = tzParts(utcGuess, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return new Date(utcGuess.getTime() - (asIfUtc - utcGuess.getTime()));
}

export function minutesInTz(date: Date, timeZone = TZ) {
  const p = tzParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

export function parseHHmm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTime(date: Date) {
  const p = tzParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDayLabel(date: Date | string) {
  const dateStr = typeof date === "string" ? date : calendarDate(date);
  return format(parseISO(`${dateStr}T12:00:00Z`), "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatMediumDate(date: Date) {
  const p = tzParts(date);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${p.day} ${months[p.month - 1]}, ${p.year}`;
}

export function formatShortDate(date: Date) {
  const p = tzParts(date);
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

export function daysBetween(from: Date, to: Date = new Date()) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

export function formatDateParam(date: Date | string) {
  return typeof date === "string" ? date : calendarDate(date);
}

export function parseDateParam(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return calendarDate();
}

export function eachCalendarDate(from: string, to: string) {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const dates: string[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    current = shiftCalendarDate(current, 1);
    if (dates.length > 366) break;
  }
  return dates;
}

export function minutesToLabel(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes} min`;
  if (hours) return `${hours}h`;
  return `${minutes} min`;
}

export function buildSlots(openTime: string, closeTime: string, slotMinutes: number) {
  const start = parseHHmm(openTime);
  const end = parseHHmm(closeTime);
  const slots: string[] = [];
  for (let m = start; m < end; m += slotMinutes) {
    slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return slots;
}

export function atTime(day: Date | string, hhmm: string) {
  const dateStr = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : calendarDate(typeof day === "string" ? new Date(day) : day);
  return zonedDateTime(dateStr, hhmm);
}

export function rangeOfCalendarDate(dateStr: string) {
  return {
    start: zonedDateTime(dateStr, "00:00"),
    end: zonedDateTime(shiftCalendarDate(dateStr, 1), "00:00"),
  };
}

export function rangeOfDay(day: Date) {
  return rangeOfCalendarDate(calendarDate(day));
}

export function monthRange(day: Date) {
  return { start: startOfMonth(day), end: endOfMonth(day) };
}

export { addDays, addMinutes, isSameDay, startOfDay, format };
