import { slugify } from "@/lib/utils";
import { publicAppOrigin } from "@/lib/public-url";

export const PARTNER_REF_COOKIE = "mb_partner_ref";
export const DEFAULT_COMMISSION_BPS = 2000;
export const DEFAULT_HOLD_DAYS = 30;

export const PARTNER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
};

export const PARTNER_STATUS_COLOR: Record<PartnerStatus, string> = {
  PENDING: "#D97706",
  ACTIVE: "#059669",
  SUSPENDED: "#EA580C",
};

export const BILLING_STATUSES = ["NONE", "TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const BILLING_STATUS_LABEL: Record<BillingStatus, string> = {
  NONE: "Sem cobrança",
  TRIAL: "Trial",
  ACTIVE: "Ativo",
  PAST_DUE: "Inadimplente",
  CANCELED: "Cancelado",
};

export const BILLING_STATUS_COLOR: Record<BillingStatus, string> = {
  NONE: "#64748B",
  TRIAL: "#2563EB",
  ACTIVE: "#059669",
  PAST_DUE: "#EA580C",
  CANCELED: "#94A3B8",
};

export const COMMISSION_STATUSES = ["PENDING", "AVAILABLE", "PAID", "CANCELED"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING: "A receber",
  AVAILABLE: "Disponível",
  PAID: "Pago",
  CANCELED: "Cancelado",
};

export const COMMISSION_TYPES = ["SALE", "BONUS", "ADJUST", "REVERSAL"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const COMMISSION_TYPE_LABEL: Record<CommissionType, string> = {
  SALE: "Venda",
  BONUS: "Bônus",
  ADJUST: "Ajuste",
  REVERSAL: "Estorno",
};

export const PIX_KEY_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export const PIX_KEY_TYPE_LABEL: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular",
  EVP: "Chave aleatória",
};

export const PAYOUT_STATUSES = ["REQUESTED", "PAID", "REJECTED"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  REQUESTED: "Solicitado",
  PAID: "Pago",
  REJECTED: "Recusado",
};

export const RESERVED_PARTNER_SLUGS = new Set([
  "www",
  "app",
  "api",
  "mail",
  "cdn",
  "static",
  "assets",
  "admin",
  "login",
  "cadastro",
  "plataforma",
  "fornecedor",
  "parceiro",
  "p",
  "beauty",
  "megabeauty",
  "dashboard",
  "uploads",
]);

export function sanitizePartnerSlug(value: string | null | undefined) {
  const slug = slugify(String(value ?? ""));
  if (!slug || slug.length < 2 || RESERVED_PARTNER_SLUGS.has(slug)) return "";
  return slug.slice(0, 40);
}

export function isPartnerStatus(value: string | null | undefined): value is PartnerStatus {
  return PARTNER_STATUSES.includes(value as PartnerStatus);
}

export function isPublicBrandPath(pathname: string | null | undefined) {
  const path = String(pathname ?? "").split("?")[0] || "/";
  if (path === "/") return true;
  return ["/login", "/cadastro", "/agendar", "/p"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function partnerBrandIsLive(status: string | null | undefined, publicSurface = false) {
  if (status === "ACTIVE") return true;
  return publicSurface && status === "PENDING";
}

export function normalizeRequestHost(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split("/")[0]
    .split(":")[0]
    .replace(/\.$/, "");
}

export function partnerHostCandidates(value: string | null | undefined) {
  const host = normalizeRequestHost(value).replace(/^www\./, "");
  if (!host) return [];
  return [host, `www.${host}`];
}

export function sanitizePartnerHost(value: string | null | undefined) {
  const host = normalizeRequestHost(String(value ?? "").replace(/^https?:\/\//, "")).replace(/^www\./, "");
  if (!host) return "";
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) return "";
  if (host === "localhost" || host.endsWith(".localhost")) return "";
  if (host.endsWith("megaflood.cloud") || host.endsWith("megaflood.app")) return "";
  return host.slice(0, 120);
}

export function partnerCustomUrl(host: string | null | undefined) {
  const clean = sanitizePartnerHost(host);
  return clean ? `https://${clean}` : "";
}

export type PartnerLandingFeature = { title: string; text: string };

export const DEFAULT_PARTNER_FEATURES: PartnerLandingFeature[] = [
  { title: "Agenda sem conflito", text: "Colunas por profissional, horários livres e a cliente marca sozinha pelo link." },
  { title: "WhatsApp do salão", text: "Confirmação, cobrança e conversa no mesmo inbox — sem celular pessoal da recepção." },
  { title: "Comissões e caixa", text: "Comanda, comissão e financeiro no mesmo lugar, para o dono ver o dia em segundos." },
];

export function defaultPartnerLanding(name: string) {
  const brand = name.trim() || "seu sistema";
  return {
    kicker: "CRM para salões, barbearias e estética",
    headline: `O sistema do seu salão, com a cara da ${brand}`,
    text: `Agenda, comandas, equipe e WhatsApp no mesmo lugar. Quem entra por este link já fica na indicação da ${brand}.`,
    cta: "Criar minha conta",
    features: DEFAULT_PARTNER_FEATURES,
  };
}

export function parseLandingFeatures(raw: string | null | undefined): PartnerLandingFeature[] {
  try {
    const parsed = JSON.parse(String(raw || "[]")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        title: String((row as { title?: unknown })?.title ?? "").trim(),
        text: String((row as { text?: unknown })?.text ?? "").trim(),
      }))
      .filter((row) => row.title && row.text)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function serializeLandingFeatures(rows: PartnerLandingFeature[]) {
  return JSON.stringify(
    rows
      .map((row) => ({ title: row.title.trim(), text: row.text.trim() }))
      .filter((row) => row.title && row.text)
      .slice(0, 6),
  );
}

export function resolvePartnerLanding(
  name: string,
  raw?: {
    kicker?: string | null;
    headline?: string | null;
    text?: string | null;
    cta?: string | null;
    features?: PartnerLandingFeature[] | string | null;
  },
) {
  const defaults = defaultPartnerLanding(name);
  const features =
    typeof raw?.features === "string" ? parseLandingFeatures(raw.features) : raw?.features?.filter((row) => row.title && row.text) ?? [];
  return {
    kicker: String(raw?.kicker ?? "").trim() || defaults.kicker,
    headline: String(raw?.headline ?? "").trim() || defaults.headline,
    text: String(raw?.text ?? "").trim() || defaults.text,
    cta: String(raw?.cta ?? "").trim() || defaults.cta,
    features: features.length ? features.slice(0, 6) : defaults.features,
  };
}

export function partnerLandingPath(slug: string) {
  const clean = sanitizePartnerSlug(slug);
  return clean ? `/p/${encodeURIComponent(clean)}` : "/";
}

export function partnerLandingUrl(slug: string, origin?: string | null) {
  const base = publicAppOrigin(origin).replace(/\/$/, "");
  return `${base}${partnerLandingPath(slug)}`;
}

export function partnerSlugFromPath(pathname: string | null | undefined) {
  const match = String(pathname ?? "").match(/^\/p\/([^/]+)/);
  return sanitizePartnerSlug(match?.[1]);
}

export function isBillingStatus(value: string | null | undefined): value is BillingStatus {
  return BILLING_STATUSES.includes(value as BillingStatus);
}

export function isCommissionStatus(value: string | null | undefined): value is CommissionStatus {
  return COMMISSION_STATUSES.includes(value as CommissionStatus);
}

export function isPixKeyType(value: string | null | undefined): value is PixKeyType {
  return PIX_KEY_TYPES.includes(value as PixKeyType);
}

export function parseCommissionPercent(value: string | number | null | undefined, fallback = 20) {
  const raw = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(raw)) return fallback * 100;
  const percent = Math.max(0, Math.min(80, raw));
  return Math.round(percent * 100);
}

export function commissionBpsToPercent(bps: number) {
  return Math.round(bps) / 100;
}

export function commissionCents(saleCents: number, bps: number) {
  if (saleCents <= 0 || bps <= 0) return 0;
  return Math.floor((saleCents * bps) / 10_000);
}

export function firstTouchPartnerId(current: string | null | undefined, incoming: string | null | undefined) {
  return current || incoming || null;
}

export function releaseAt(paidAt: Date, holdDays = DEFAULT_HOLD_DAYS) {
  const next = new Date(paidAt);
  next.setUTCDate(next.getUTCDate() + Math.max(0, holdDays));
  return next;
}

export function hostSlugFromHost(host: string | null | undefined, appHost?: string | null) {
  const hostname = String(host ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  if (!hostname) return "";
  const root = String(appHost ?? "")
    .replace(/^https?:\/\//, "")
    .split(":")[0]
    .split("/")[0]
    .toLowerCase();
  if (!root || hostname === root || hostname === `www.${root}`) return "";
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    if (sub && !sub.includes(".")) return sanitizePartnerSlug(sub);
  }
  return "";
}

export function partnerAffiliatePath(slug: string) {
  const clean = sanitizePartnerSlug(slug);
  return clean ? `/cadastro?ref=${encodeURIComponent(clean)}` : "/cadastro";
}

export function partnerAffiliateUrl(slug: string, origin?: string | null) {
  const base = publicAppOrigin(origin).replace(/\/$/, "");
  return `${base}${partnerAffiliatePath(slug)}`;
}

export function partnerSubdomainUrl(slug: string, origin?: string | null) {
  const clean = sanitizePartnerSlug(slug);
  if (!clean) return "";
  try {
    const url = new URL(publicAppOrigin(origin));
    return `${url.protocol}//${clean}.${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "";
  }
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function summarizePartnerLedger(
  rows: { status: string; type: string; commissionCents: number }[],
) {
  let earned = 0;
  let available = 0;
  let pending = 0;
  let paid = 0;
  for (const row of rows) {
    if (row.status === "CANCELED") continue;
    earned += row.commissionCents;
    if (row.status === "AVAILABLE") available += row.commissionCents;
    if (row.status === "PENDING") pending += row.commissionCents;
    if (row.status === "PAID") paid += row.commissionCents;
  }
  return { earned, available, pending, paid };
}

export function conversionRate(referred: number, paying: number) {
  if (referred <= 0) return 0;
  return Math.round((paying / referred) * 1000) / 10;
}
