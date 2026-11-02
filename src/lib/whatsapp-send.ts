import { prisma } from "@/lib/db";
import {
  isEvolutionConfigured,
  markMessagesAsRead,
  sendPresence,
  sendTextMessage,
  type EvolutionConfig,
} from "@/lib/evolution";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { evolutionSendFailure, toEvolutionNumber, whatsappPhoneCandidates } from "@/lib/whatsapp-campaigns";
import { HUMAN_TYPING_DELAY_MS, typingDelayMs } from "@/lib/whatsapp-copy";
import {
  isMetaConfigured,
  metaSendFailure,
  normalizeWhatsAppProvider,
  sendMetaText,
  type WhatsAppProvider,
} from "@/lib/whatsapp-meta";

export type SalonWhatsAppTenant = {
  whatsappProvider?: string | null;
  evolutionInstance?: string | null;
  evolutionStatus?: string | null;
  metaPhoneNumberId?: string | null;
  metaAccessToken?: string | null;
  metaStatus?: string | null;
};

export function salonWhatsAppChannel(tenant: SalonWhatsAppTenant | null | undefined): WhatsAppProvider {
  return normalizeWhatsAppProvider(tenant?.whatsappProvider);
}

export async function hasInboundWhatsAppChat(tenantId: string, phone: string) {
  const candidates = whatsappPhoneCandidates(phone);
  if (!candidates.length) return false;
  const found = await prisma.conversation.findFirst({
    where: {
      tenantId,
      phone: { in: candidates },
      messages: { some: { direction: "IN" } },
    },
    select: { id: true },
  });
  return Boolean(found);
}

export function isSalonWhatsAppConnected(tenant: SalonWhatsAppTenant | null | undefined) {
  if (salonWhatsAppChannel(tenant) === "official") {
    return tenant?.metaStatus === "open" && isMetaConfigured(tenant);
  }
  return tenant?.evolutionStatus === "open" && Boolean(tenant?.evolutionInstance);
}

export async function loadSalonEvolutionConfig(tenantId: string): Promise<EvolutionConfig | null> {
  const [tenant, server] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappProvider: true, evolutionInstance: true, evolutionStatus: true },
    }),
    resolvePlatformIntegrations(),
  ]);
  if (!tenant || salonWhatsAppChannel(tenant) !== "evolution") return null;
  const config = {
    url: server.evolutionUrl,
    apiKey: server.evolutionApiKey,
    instance: tenant.evolutionInstance ?? "",
  };
  if (!isEvolutionConfigured(config) || tenant.evolutionStatus !== "open") return null;
  return config;
}

export async function sendSalonComposing(tenantId: string, phone: string) {
  const config = await loadSalonEvolutionConfig(tenantId);
  if (!config) return { sent: false as const };
  try {
    await sendPresence(config, toEvolutionNumber(phone), HUMAN_TYPING_DELAY_MS, { wait: false });
    return { sent: true as const };
  } catch {
    return { sent: false as const };
  }
}

export async function markSalonConversationRead(input: { tenantId: string; phone: string; waIds: string[] }) {
  const config = await loadSalonEvolutionConfig(input.tenantId);
  if (!config || !input.waIds.length) return { sent: false as const };
  try {
    await markMessagesAsRead(
      config,
      input.waIds.map((id) => ({ phone: input.phone, id })),
    );
    return { sent: true as const };
  } catch {
    return { sent: false as const };
  }
}

export async function sendSalonWhatsApp(input: {
  tenantId: string;
  phone: string;
  text: string;
  presence?: boolean;
  delayMs?: number;
}) {
  const [tenant, server] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: {
        whatsappProvider: true,
        evolutionInstance: true,
        evolutionStatus: true,
        metaPhoneNumberId: true,
        metaAccessToken: true,
        metaStatus: true,
      },
    }),
    resolvePlatformIntegrations(),
  ]);
  if (!tenant) return { sent: false as const, channel: "none" as const, error: "Salão não encontrado." };

  const channel = salonWhatsAppChannel(tenant);
  if (channel === "official") {
    if (!isMetaConfigured(tenant) || tenant.metaStatus !== "open") {
      return { sent: false as const, channel, error: "Conecte a API oficial em Configurações → WhatsApp." };
    }
    try {
      await sendMetaText(
        {
          phoneNumberId: tenant.metaPhoneNumberId!,
          accessToken: tenant.metaAccessToken!,
          graphVersion: server.metaGraphVersion,
        },
        input.phone,
        input.text,
      );
      return { sent: true as const, channel };
    } catch (error) {
      return { sent: false as const, channel, error: metaSendFailure(error) };
    }
  }

  const config = {
    url: server.evolutionUrl,
    apiKey: server.evolutionApiKey,
    instance: tenant.evolutionInstance ?? "",
  };
  if (!isEvolutionConfigured(config) || tenant.evolutionStatus !== "open") {
    return { sent: false as const, channel, error: "Conecte o WhatsApp em Configurações para enviar." };
  }
  try {
    const delayMs = input.delayMs ?? (input.presence ? typingDelayMs(input.text) : 0);
    await sendTextMessage(config, toEvolutionNumber(input.phone), input.text, {
      presence: input.presence === true || delayMs > 0,
      delayMs,
    });
    return { sent: true as const, channel };
  } catch (error) {
    return { sent: false as const, channel, error: evolutionSendFailure(error) };
  }
}
