import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { toEvolutionNumber } from "@/lib/whatsapp-campaigns";

export const WHATSAPP_PROVIDERS = ["evolution", "official"] as const;
export type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];

export const DEFAULT_META_GRAPH_VERSION = "v21.0";

export type MetaCloudConfig = {
  phoneNumberId: string;
  accessToken: string;
  graphVersion?: string | null;
};

export type MetaInboundMessage = {
  phoneNumberId: string;
  phone: string;
  body: string;
  waId: string | null;
  name: string | null;
};

export function isWhatsAppProvider(value: string | null | undefined): value is WhatsAppProvider {
  return WHATSAPP_PROVIDERS.includes(value as WhatsAppProvider);
}

export function normalizeWhatsAppProvider(value?: string | null): WhatsAppProvider {
  return value === "official" ? "official" : "evolution";
}

export function isMetaConfigured(
  input:
    | {
        phoneNumberId?: string | null;
        accessToken?: string | null;
        metaPhoneNumberId?: string | null;
        metaAccessToken?: string | null;
      }
    | null
    | undefined,
) {
  const phoneNumberId = input?.phoneNumberId || input?.metaPhoneNumberId;
  const accessToken = input?.accessToken || input?.metaAccessToken;
  return Boolean(phoneNumberId?.trim() && accessToken?.trim());
}

export function metaGraphUrl(version: string | null | undefined, path: string) {
  const v = String(version || DEFAULT_META_GRAPH_VERSION).trim().replace(/^\/+|\/+$/g, "") || DEFAULT_META_GRAPH_VERSION;
  return `https://graph.facebook.com/${v}/${path.replace(/^\/+/, "")}`;
}

export function newMetaVerifyToken() {
  return `mb_${randomBytes(16).toString("hex")}`;
}

export function metaVerifyChallenge(
  query: { mode?: string | null; token?: string | null; challenge?: string | null },
  expected: string | null | undefined,
) {
  if (query.mode !== "subscribe") return null;
  if (!expected || !query.token || query.token !== expected) return null;
  return query.challenge || null;
}

export function metaSignatureOk(rawBody: string, signature: string | null | undefined, appSecret: string | null | undefined) {
  if (!appSecret) return true;
  const given = String(signature ?? "");
  if (!given.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(given.slice("sha256=".length));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function messageBody(message: Record<string, unknown>) {
  const type = String(message.type ?? "text");
  if (type === "text") {
    const text = asRecord(message.text);
    return typeof text?.body === "string" ? text.body : "";
  }
  if (type === "button") {
    const button = asRecord(message.button);
    return typeof button?.text === "string" ? button.text : "";
  }
  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const reply = asRecord(interactive?.button_reply) ?? asRecord(interactive?.list_reply);
    return typeof reply?.title === "string" ? reply.title : "";
  }
  return "";
}

export function extractMetaInbound(payload: unknown): MetaInboundMessage[] {
  const root = asRecord(payload);
  const entries = Array.isArray(root?.entry) ? root.entry : [];
  const out: MetaInboundMessage[] = [];
  for (const entry of entries) {
    const changes = Array.isArray(asRecord(entry)?.changes) ? (asRecord(entry)?.changes as unknown[]) : [];
    for (const change of changes) {
      const value = asRecord(asRecord(change)?.value);
      if (!value) continue;
      const metadata = asRecord(value.metadata);
      const phoneNumberId = String(metadata?.phone_number_id ?? "");
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const names = new Map<string, string>();
      for (const contact of contacts) {
        const row = asRecord(contact);
        const waId = String(row?.wa_id ?? "").replace(/\D/g, "");
        const profile = asRecord(row?.profile);
        if (waId && typeof profile?.name === "string") names.set(waId, profile.name);
      }
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const item of messages) {
        const message = asRecord(item);
        if (!message) continue;
        const phone = String(message.from ?? "").replace(/\D/g, "");
        const body = messageBody(message).trim();
        if (!phone || !body) continue;
        out.push({
          phoneNumberId,
          phone,
          body,
          waId: typeof message.id === "string" ? message.id : null,
          name: names.get(phone) ?? null,
        });
      }
    }
  }
  return out;
}

async function metaErrorMessage(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { error?: { message?: string; error_user_msg?: string; code?: number } };
    const message = json.error?.error_user_msg || json.error?.message || text;
    const code = json.error?.code;
    if (code === 131047 || /24 hour|re-engagement|janela/i.test(message)) {
      return "A API oficial só envia texto livre dentro de 24h da última mensagem da cliente. Fora dessa janela é preciso um modelo aprovado na Meta.";
    }
    if (code === 190 || /session has expired|invalid oauth/i.test(message)) {
      return "O token da API oficial expirou. Gere um token permanente no app da Meta e salve de novo.";
    }
    return message.slice(0, 280);
  } catch {
    return text.slice(0, 280) || `Meta API ${response.status}`;
  }
}

export async function sendMetaText(config: MetaCloudConfig, phone: string, text: string) {
  const to = toEvolutionNumber(phone);
  const response = await fetch(metaGraphUrl(config.graphVersion, `${config.phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  if (!response.ok) throw new Error(await metaErrorMessage(response));
  return response.json();
}

export async function readMetaPhone(config: MetaCloudConfig) {
  const response = await fetch(
    metaGraphUrl(config.graphVersion, `${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`),
    { headers: { Authorization: `Bearer ${config.accessToken}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) throw new Error(await metaErrorMessage(response));
  const json = (await response.json()) as { display_phone_number?: string; verified_name?: string };
  return {
    number: String(json.display_phone_number ?? "").replace(/\D/g, "") || null,
    name: json.verified_name ?? null,
  };
}

export function metaSendFailure(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  if (raw) return raw;
  return "A API oficial recusou o envio.";
}
