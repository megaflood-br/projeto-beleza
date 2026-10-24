export type EvolutionConfig = {
  url: string;
  apiKey: string;
  instance: string;
};

function headers(apiKey: string) {
  return {
    "Content-Type": "application/json",
    apikey: apiKey,
  };
}

function evolutionErrorMessage(json: unknown, text: string, status: number) {
  if (json && typeof json === "object" && "message" in json) {
    const value = (json as { message?: unknown }).message;
    if (typeof value === "string" && value) return value;
    if (value != null) return JSON.stringify(value).slice(0, 240);
  }
  return text.slice(0, 240) || `Evolution API ${status}`;
}

export function isEvolutionConfigured(config: Partial<EvolutionConfig> | null | undefined) {
  return Boolean(config?.url && config?.apiKey && config?.instance);
}

export async function sendTextMessage(config: EvolutionConfig, number: string, text: string) {
  const url = `${config.url.replace(/\/$/, "")}/message/sendText/${config.instance}`;
  const response = await fetch(url, {
    method: "POST",
    headers: headers(config.apiKey),
    body: JSON.stringify({
      number: number.replace(/\D/g, ""),
      text,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API ${response.status}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

export async function evoFetch(config: Pick<EvolutionConfig, "url" | "apiKey">, path: string, init?: RequestInit) {
  const url = `${config.url.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(8000),
    headers: {
      ...headers(config.apiKey),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(evolutionErrorMessage(json, text, response.status));
  }
  return json;
}

export function extractQrBase64(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidates = [root.base64, root.qrcode, root.qrCode, (root.qrcode as Record<string, unknown> | undefined)?.base64];
  if (root.qrcode && typeof root.qrcode === "object") {
    const nested = root.qrcode as Record<string, unknown>;
    candidates.push(nested.base64, nested.code);
  }
  if (root.qrCode && typeof root.qrCode === "object") {
    candidates.push((root.qrCode as Record<string, unknown>).base64);
  }
  for (const value of candidates) {
    if (typeof value === "string" && value.includes("base64")) return value;
    if (typeof value === "string" && value.length > 80) {
      return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
    }
  }
  return null;
}

export function parseEvolutionState(payload: unknown): "open" | "connecting" | "close" {
  if (!payload || typeof payload !== "object") return "close";
  const root = payload as Record<string, unknown>;
  const instance = (root.instance ?? root) as Record<string, unknown>;
  const raw = String(instance.state ?? instance.status ?? root.state ?? root.status ?? "").toLowerCase();
  if (raw.includes("open") || raw === "connected") return "open";
  if (raw.includes("connect") || raw.includes("qr") || raw === "pairing") return "connecting";
  return "close";
}

export function extractEvolutionNumber(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const instance = (root.instance ?? {}) as Record<string, unknown>;
  const owner = instance.owner ?? instance.wuid ?? root.owner ?? root.number;
  if (typeof owner !== "string" || !owner) return null;
  return owner.replace("@s.whatsapp.net", "").replace(/\D/g, "") || null;
}

export async function getConnectionState(config: EvolutionConfig) {
  return evoFetch(config, `/instance/connectionState/${config.instance}`);
}

export async function createEvolutionInstance(
  server: Pick<EvolutionConfig, "url" | "apiKey">,
  params: { instance: string; webhookUrl?: string },
) {
  return evoFetch(server, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: params.instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      groupsIgnore: true,
      ...(params.webhookUrl
        ? {
            webhook: {
              url: params.webhookUrl,
              byEvents: false,
              base64: false,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
            },
          }
        : {}),
    }),
  });
}

export async function connectEvolutionInstance(config: EvolutionConfig) {
  return evoFetch(config, `/instance/connect/${config.instance}`);
}

export async function setEvolutionWebhook(config: EvolutionConfig, webhookUrl: string) {
  return evoFetch(config, `/webhook/set/${config.instance}`, {
    method: "POST",
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    }),
  });
}

export async function logoutEvolutionInstance(config: EvolutionConfig) {
  return evoFetch(config, `/instance/logout/${config.instance}`, { method: "DELETE" });
}

export function extractInboundText(payload: Record<string, unknown>) {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const message = (data.message ?? {}) as Record<string, unknown>;
  const conversation = message.conversation;
  if (typeof conversation === "string") return conversation;
  const extended = message.extendedTextMessage as { text?: string } | undefined;
  if (extended?.text) return extended.text;
  return "";
}

export function extractPhone(payload: Record<string, unknown>) {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const key = (data.key ?? payload.key ?? {}) as Record<string, unknown>;
  const remoteJid = String(key.remoteJid ?? "");
  return remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
}
