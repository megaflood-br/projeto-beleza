import { prisma } from "@/lib/db";
import { calendarDate, shiftCalendarDate, zonedDateTime } from "@/lib/dates";
import { normalizeWhatsAppPhone, whatsappPhoneCandidates } from "@/lib/whatsapp-campaigns";

export const MARKETING_BATCH = 50;
export const MARKETING_CAP = 400;
export const MARKETING_SEND_MAX = 15;
export const MARKETING_SEND_GAP_MS = 2000;
export const MARKETING_DEFAULT_INACTIVE_DAYS = 30;

export const MARKETING_AUDIENCES = ["SERVICE", "TAG", "INACTIVE", "ALL"] as const;
export type MarketingAudience = (typeof MARKETING_AUDIENCES)[number];

export const MARKETING_CAMPAIGN_STATUSES = ["DRAFT", "SENDING", "SENT"] as const;
export type MarketingCampaignStatus = (typeof MARKETING_CAMPAIGN_STATUSES)[number];

export const MARKETING_RECIPIENT_STATUSES = ["PENDING", "SENT", "FAILED", "REPLIED", "RESOLVED"] as const;
export type MarketingRecipientStatus = (typeof MARKETING_RECIPIENT_STATUSES)[number];

export const MARKETING_AUDIENCE_LABEL: Record<MarketingAudience, string> = {
  SERVICE: "Já fez o serviço",
  TAG: "Hashtag",
  INACTIVE: "Sem visita",
  ALL: "Todos com WhatsApp",
};

export type MarketingClient = {
  id: string;
  name: string;
  phone: string;
  tags?: string | null;
  active?: boolean;
  notifications?: boolean;
  lastVisitAt?: Date | null;
  serviceIds?: string[];
};

export function parseRecipientIds(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return [...new Set(raw.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean))];
}

export function parseMarketingAudience(value: string | null | undefined): MarketingAudience {
  const raw = String(value ?? "").trim().toUpperCase();
  return MARKETING_AUDIENCES.includes(raw as MarketingAudience) ? (raw as MarketingAudience) : "ALL";
}

export function parseInactiveDays(value: unknown, fallback = MARKETING_DEFAULT_INACTIVE_DAYS) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(365, Math.max(7, Math.round(n)));
}

export function parseClientTags(tags: string | null | undefined) {
  return String(tags ?? "")
    .split(/[,;#]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean);
}

export function clientHasTag(tags: string | null | undefined, tag: string) {
  const needle = tag.replace(/^#/, "").trim().toLowerCase();
  if (!needle) return false;
  return parseClientTags(tags).some((item) => item.toLowerCase() === needle);
}

export function isEligibleMarketingClient(client: {
  phone: string | null | undefined;
  active?: boolean | null;
  notifications?: boolean | null;
}) {
  if (client.active === false) return false;
  if (client.notifications === false) return false;
  return normalizeWhatsAppPhone(client.phone ?? "").length >= 10;
}

export function isInactiveSince(lastVisitAt: Date | null | undefined, days: number, now = new Date()) {
  if (!lastVisitAt) return true;
  return now.getTime() - lastVisitAt.getTime() >= days * 24 * 60 * 60 * 1000;
}

export function renderMarketingBody(template: string, vars: { nome?: string; salao?: string }) {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      if (key === "nome") return String(vars.nome ?? "").trim();
      if (key === "salao") return String(vars.salao ?? "").trim();
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function marketingPhoneKeys(value: string | null | undefined) {
  return whatsappPhoneCandidates(value ?? "");
}

export function phonesMatch(left: string | null | undefined, right: string | null | undefined) {
  const keys = new Set(marketingPhoneKeys(left));
  return marketingPhoneKeys(right).some((phone) => keys.has(phone));
}

export function isMarketingReply(sentAt: Date | null | undefined, inboundAt: Date) {
  if (!sentAt) return false;
  return inboundAt.getTime() >= sentAt.getTime();
}

export function marketingLane(status: string): "pending" | "sent" | "replied" | "resolved" {
  if (status === "RESOLVED") return "resolved";
  if (status === "REPLIED") return "replied";
  if (status === "PENDING") return "pending";
  return "sent";
}

export function summarizeMarketing(rows: { status: string }[]) {
  const counts = { pending: 0, sent: 0, failed: 0, replied: 0, resolved: 0, waiting: 0, total: rows.length };
  for (const row of rows) {
    if (row.status === "PENDING") counts.pending += 1;
    else if (row.status === "SENT") counts.sent += 1;
    else if (row.status === "FAILED") counts.failed += 1;
    else if (row.status === "REPLIED") counts.replied += 1;
    else if (row.status === "RESOLVED") counts.resolved += 1;
  }
  counts.waiting = counts.sent + counts.failed;
  return counts;
}

export function clientHadService(serviceIds: string[] | undefined, serviceId: string) {
  const needle = serviceId.trim();
  if (!needle) return false;
  return (serviceIds ?? []).includes(needle);
}

export function nextCampaignStatus(pending: number, alreadyStarted: boolean): MarketingCampaignStatus {
  if (pending > 0) return alreadyStarted ? "SENDING" : "DRAFT";
  return alreadyStarted ? "SENT" : "DRAFT";
}

export function pickMarketingAudience(
  clients: MarketingClient[],
  input: { audience: MarketingAudience; tag?: string; serviceId?: string; inactiveDays?: number; cap?: number; now?: Date },
) {
  const cap = Math.min(MARKETING_CAP, Math.max(1, input.cap ?? MARKETING_CAP));
  const tag = String(input.tag ?? "").trim();
  const serviceId = String(input.serviceId ?? "").trim();
  const days = parseInactiveDays(input.inactiveDays);
  const now = input.now ?? new Date();
  const picked: MarketingClient[] = [];
  for (const client of clients) {
    if (!isEligibleMarketingClient(client)) continue;
    if (input.audience === "TAG" && !clientHasTag(client.tags, tag)) continue;
    if (input.audience === "SERVICE" && !clientHadService(client.serviceIds, serviceId)) continue;
    if (input.audience === "INACTIVE" && !isInactiveSince(client.lastVisitAt, days, now)) continue;
    picked.push(client);
    if (picked.length >= cap) break;
  }
  return picked;
}

export async function resolveMarketingAudience(input: {
  tenantId: string;
  audience: MarketingAudience;
  tag?: string;
  serviceId?: string;
  inactiveDays?: number;
  cap?: number;
}) {
  const cap = Math.min(MARKETING_CAP, Math.max(1, input.cap ?? MARKETING_CAP));
  const tag = String(input.tag ?? "").trim();
  const serviceId = String(input.serviceId ?? "").trim();
  const days = parseInactiveDays(input.inactiveDays);
  const cutoff = zonedDateTime(shiftCalendarDate(calendarDate(), -days), "00:00");

  if (input.audience === "SERVICE" && !serviceId) return [];

  const where = {
    tenantId: input.tenantId,
    active: true,
    notifications: true,
    phone: { not: "" },
    ...(input.audience === "INACTIVE"
      ? {
          appointments: {
            none: { startAt: { gte: cutoff }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
          },
        }
      : {}),
    ...(input.audience === "TAG" && tag ? { tags: { contains: tag } } : {}),
    ...(input.audience === "SERVICE"
      ? {
          OR: [
            {
              appointments: {
                some: {
                  status: { notIn: ["CANCELLED", "NO_SHOW"] },
                  items: { some: { serviceId } },
                },
              },
            },
            {
              comandas: {
                some: {
                  status: { not: "CANCELLED" },
                  items: { some: { serviceId } },
                },
              },
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.client.findMany({
    where,
    select: { id: true, name: true, phone: true, tags: true, active: true, notifications: true },
    orderBy: { name: "asc" },
    take: input.audience === "TAG" || input.audience === "SERVICE" ? cap * 4 : cap + 50,
  });

  return pickMarketingAudience(
    input.audience === "SERVICE" ? rows.map((row) => ({ ...row, serviceIds: [serviceId] })) : rows,
    {
      audience: input.audience,
      tag,
      serviceId,
      inactiveDays: days,
      cap,
    },
  ).map((client) => ({
    id: client.id,
    name: client.name,
    phone: normalizeWhatsAppPhone(client.phone),
  }));
}

export async function markMarketingReplies(input: {
  tenantId: string;
  phone: string;
  body: string;
  at?: Date;
  conversationId?: string | null;
}) {
  if (typeof prisma.marketingRecipient?.findMany !== "function") return 0;
  const keys = marketingPhoneKeys(input.phone);
  if (!keys.length) return 0;
  const at = input.at ?? new Date();
  const rows = await prisma.marketingRecipient.findMany({
    where: { tenantId: input.tenantId, status: "SENT", phone: { in: keys } },
    select: { id: true, sentAt: true, conversationId: true },
  });
  const hits = rows.filter((row) => isMarketingReply(row.sentAt, at));
  if (!hits.length) return 0;
  const preview = String(input.body ?? "").trim().slice(0, 140);
  await Promise.all(
    hits.map((row) =>
      prisma.marketingRecipient.update({
        where: { id: row.id },
        data: {
          status: "REPLIED",
          repliedAt: at,
          replyPreview: preview,
          conversationId: row.conversationId || input.conversationId,
        },
      }),
    ),
  );
  return hits.length;
}

export async function syncMarketingReplies(tenantId: string, campaignId?: string) {
  if (typeof prisma.marketingRecipient?.findMany !== "function") return 0;
  const sent = await prisma.marketingRecipient.findMany({
    where: { tenantId, status: "SENT", ...(campaignId ? { campaignId } : {}) },
    select: { id: true, phone: true, sentAt: true },
  });
  if (!sent.length) return 0;

  const keys = [...new Set(sent.flatMap((row) => marketingPhoneKeys(row.phone)))];
  const conversations = await prisma.conversation.findMany({
    where: { tenantId, phone: { in: keys } },
    select: {
      id: true,
      phone: true,
      messages: {
        where: { direction: "IN" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true },
      },
    },
  });

  let updated = 0;
  for (const row of sent) {
    const conversation = conversations.find((item) => phonesMatch(item.phone, row.phone));
    const inbound = conversation?.messages[0];
    if (!inbound || !isMarketingReply(row.sentAt, inbound.createdAt)) continue;
    await prisma.marketingRecipient.update({
      where: { id: row.id },
      data: {
        status: "REPLIED",
        repliedAt: inbound.createdAt,
        replyPreview: inbound.body.slice(0, 140),
        conversationId: conversation?.id,
      },
    });
    updated += 1;
  }
  return updated;
}
