import { prisma } from "@/lib/db";
import {
  extractEvolutionMessageId,
  extractEvolutionNumber,
  extractInboundText,
  extractPhone,
  extractQrBase64,
  isEvolutionFromMe,
  parseEvolutionState,
  evolutionWebhookKind,
} from "@/lib/evolution";
import { ingestInboundWhatsApp, ingestOutboundFromDevice } from "@/lib/whatsapp-inbound";

export async function applyEvolutionWebhook(tenantId: string, payload: Record<string, unknown>) {
  const kind = evolutionWebhookKind(payload);
  if (kind === "qrcode") {
    const qr = extractQrBase64(payload.data ?? payload) ?? extractQrBase64(payload);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        evolutionStatus: "connecting",
        ...(qr ? { evolutionQr: qr } : {}),
      },
    });
    return { ok: true as const, event: "qrcode" as const };
  }

  if (kind === "connection") {
    const state = parseEvolutionState(payload.data ?? payload);
    const number = extractEvolutionNumber(payload.data ?? payload);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        evolutionStatus: state,
        ...(number ? { evolutionNumber: number } : {}),
        ...(state === "open" ? { evolutionQr: null } : {}),
      },
    });
    return { ok: true as const, event: "connection" as const };
  }

  const phone = extractPhone(payload);
  const body = extractInboundText(payload);
  const waId = extractEvolutionMessageId(payload) || null;
  if (!phone) return { ok: true as const, ignored: true as const };
  if (!body) return { ok: true as const, event: "ack" as const };

  if (isEvolutionFromMe(payload)) {
    await ingestOutboundFromDevice({ tenantId, phone, body, waId });
    return { ok: true as const, event: "from-me" as const };
  }

  await ingestInboundWhatsApp({
    tenantId,
    phone,
    body,
    waId,
    channel: "evolution",
  });
  return { ok: true as const, event: kind };
}
