import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const TZ = "America/Sao_Paulo";

export function formatTime(date: Date) {
  return format(date, "HH:mm");
}

export function formatDayLabel(date: Date) {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatShortDate(date: Date) {
  return format(date, "dd/MM/yyyy");
}

export function formatDateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function parseDateParam(value?: string | null) {
  if (!value) return startOfDay(new Date());
  try {
    return startOfDay(parseISO(value));
  } catch {
    return startOfDay(new Date());
  }
}

export function minutesToLabel(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  return `${minutes}min`;
}

export function buildSlots(openTime: string, closeTime: string, slotMinutes: number) {
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const start = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  const slots: string[] = [];
  for (let m = start; m < end; m += slotMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export function atTime(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const next = startOfDay(day);
  next.setHours(h, m, 0, 0);
  return next;
}

export function rangeOfDay(day: Date) {
  const start = startOfDay(day);
  return { start, end: addDays(start, 1) };
}

export function monthRange(day: Date) {
  return { start: startOfMonth(day), end: endOfMonth(day) };
}

export { addDays, addMinutes, isSameDay, startOfDay, format };
