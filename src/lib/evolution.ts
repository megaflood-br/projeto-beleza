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

export async function getConnectionState(config: EvolutionConfig) {
  const url = `${config.url.replace(/\/$/, "")}/instance/connectionState/${config.instance}`;
  const response = await fetch(url, { headers: headers(config.apiKey) });
  if (!response.ok) {
    throw new Error(`Não foi possível consultar a instância (${response.status})`);
  }
  return response.json() as Promise<{ instance?: { state?: string } }>;
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
