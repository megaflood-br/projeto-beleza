import { formatShortDate, formatTime } from "@/lib/dates";
import type { Role } from "@/lib/constants";

export const PRESENCE_TTL_MS = 45_000;
export const CALL_RING_TIMEOUT_MS = 45_000;
export const LIVE_POLL_MS = 2_000;
export const LIVE_CALL_POLL_MS = 1_000;

export type SupportSide = "PLATFORM" | "SALON";

export function supportSide(role: Role | string): SupportSide {
  return role === "SUPER_ADMIN" ? "PLATFORM" : "SALON";
}

export function isPresenceOnline(lastSeenAt: Date | string, now = new Date()) {
  const seen = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  return now.getTime() - seen.getTime() <= PRESENCE_TTL_MS;
}

export function shouldExpireRinging(startedAt: Date | string, now = new Date()) {
  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  return now.getTime() - start.getTime() > CALL_RING_TIMEOUT_MS;
}

export function nextTicketNumberFromLast(last: number | null | undefined) {
  return (last ?? 0) + 1;
}

export function ticketUnreadFor(
  side: SupportSide,
  ticket: { unreadAdmin: number; unreadSalon: number },
) {
  return side === "PLATFORM" ? ticket.unreadAdmin : ticket.unreadSalon;
}

export function reopenOnSalonReply(status: string) {
  return status === "RESOLVED" || status === "CLOSED" || status === "PENDING";
}

export function formatSupportWhen(iso: string | Date, now = new Date()) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diff = now.getTime() - date.getTime();
  if (diff < 45_000) return "agora";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (diff < 20 * 3_600_000) return formatTime(date);
  return `${formatShortDate(date)} ${formatTime(date)}`;
}
