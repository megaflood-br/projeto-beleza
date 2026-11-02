import { prisma } from "@/lib/db";
import { evolutionWebhookUrl, instanceNameForTenant, maskSecret, metaWebhookUrl, resolvePlatformIntegrations } from "@/lib/integrations";
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  extractEvolutionNumber,
  extractQrBase64,
  getConnectionState,
  parseEvolutionState,
  setEvolutionWebhook,
  type EvolutionConfig,
} from "@/lib/evolution";
import { isMetaConfigured, normalizeWhatsAppProvider, type WhatsAppProvider } from "@/lib/whatsapp-meta";

export type WhatsAppLive = {
  provider: WhatsAppProvider;
  connected: boolean;
  serverReady: boolean;
  instance: string | null;
  state: "open" | "connecting" | "close";
  qr: string | null;
  number: string | null;
  webhookUrl: string;
  error: string | null;
  officialReady: boolean;
  officialState: "open" | "close";
  officialNumber: string | null;
  officialPhoneNumberId: string;
  officialWabaId: string;
  officialTokenMasked: string;
  officialWebhookUrl: string;
  officialVerifyToken: string;
};

function salonConfig(server: { evolutionUrl: string; evolutionApiKey: string }, instance: string): EvolutionConfig {
  return { url: server.evolutionUrl, apiKey: server.evolutionApiKey, instance };
}

function officialFromTenant(
  tenant: {
    slug: string;
    metaPhoneNumberId: string | null;
    metaAccessToken: string | null;
    metaWabaId: string | null;
    metaVerifyToken: string | null;
    metaNumber: string | null;
    metaStatus: string | null;
  },
  publicAppUrl: string,
) {
  return {
    officialReady: isMetaConfigured(tenant),
    officialState: tenant.metaStatus === "open" && isMetaConfigured(tenant) ? ("open" as const) : ("close" as const),
    officialNumber: tenant.metaNumber,
    officialPhoneNumberId: tenant.metaPhoneNumberId ?? "",
    officialWabaId: tenant.metaWabaId ?? "",
    officialTokenMasked: tenant.metaAccessToken ? maskSecret(tenant.metaAccessToken) : "",
    officialWebhookUrl: metaWebhookUrl(publicAppUrl, tenant.slug),
    officialVerifyToken: tenant.metaVerifyToken ?? "",
  };
}

const emptyOfficial = {
  officialReady: false,
  officialState: "close" as const,
  officialNumber: null,
  officialPhoneNumberId: "",
  officialWabaId: "",
  officialTokenMasked: "",
  officialWebhookUrl: "",
  officialVerifyToken: "",
};

export async function readWhatsAppLive(tenantId: string): Promise<WhatsAppLive> {
  const [tenant, server] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    resolvePlatformIntegrations(),
  ]);
  if (!tenant) {
    return {
      provider: "evolution",
      connected: false,
      serverReady: false,
      instance: null,
      state: "close",
      qr: null,
      number: null,
      webhookUrl: "",
      error: "Salão não encontrado.",
      ...emptyOfficial,
    };
  }

  const official = officialFromTenant(tenant, server.publicAppUrl);
  const provider = normalizeWhatsAppProvider(tenant.whatsappProvider);
  const webhookUrl = evolutionWebhookUrl(server.publicAppUrl, tenant.slug);
  const withChannel = (
    live: Omit<WhatsAppLive, "provider" | "connected" | keyof typeof emptyOfficial>,
  ): WhatsAppLive => {
    const next = { ...official, ...live, provider };
    return {
      ...next,
      connected: provider === "official" ? next.officialState === "open" : next.state === "open",
    };
  };

  if (!server.hasEvolution || provider === "official") {
    return withChannel({
      serverReady: server.hasEvolution,
      instance: tenant.evolutionInstance,
      state: (tenant.evolutionStatus as WhatsAppLive["state"]) || "close",
      qr: null,
      number: tenant.evolutionNumber,
      webhookUrl,
      error: null,
    });
  }

  const instance = tenant.evolutionInstance || instanceNameForTenant(tenant.slug);
  const config = salonConfig(server, instance);
  try {
    const statePayload = await getConnectionState(config);
    const state = parseEvolutionState(statePayload);
    const number = extractEvolutionNumber(statePayload) ?? tenant.evolutionNumber;
    let qr: string | null = null;
    if (state !== "open") {
      const connect = await connectEvolutionInstance(config);
      qr = extractQrBase64(connect);
    }
    if (tenant.evolutionStatus !== state || tenant.evolutionNumber !== number || tenant.evolutionInstance !== instance) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { evolutionInstance: instance, evolutionStatus: state, evolutionNumber: number },
      });
    }
    return withChannel({
      serverReady: true,
      instance,
      state,
      qr,
      number,
      webhookUrl,
      error: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar a Evolution.";
    const missing = /not found|does not exist|404|não encontrada/i.test(message);
    return withChannel({
      serverReady: true,
      instance,
      state: (tenant.evolutionStatus as WhatsAppLive["state"]) || "close",
      qr: null,
      number: tenant.evolutionNumber,
      webhookUrl,
      error: missing ? null : message,
    });
  }
}

export async function provisionWhatsAppInstance(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Salão não encontrado.");
  const server = await resolvePlatformIntegrations();
  if (!server.hasEvolution) throw new Error("O servidor WhatsApp ainda não foi configurado na plataforma.");
  const instance = tenant.evolutionInstance || instanceNameForTenant(tenant.slug);
  const webhookUrl = evolutionWebhookUrl(server.publicAppUrl, tenant.slug);
  const config = salonConfig(server, instance);

  try {
    const created = await createEvolutionInstance(config, { instance, webhookUrl: webhookUrl || undefined });
    const qr = extractQrBase64(created);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { evolutionInstance: instance, evolutionStatus: "connecting" },
    });
    if (qr) return { instance, qr };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/exist|already|já existe|403|409/i.test(message)) throw error;
  }

  if (webhookUrl) {
    try {
      await setEvolutionWebhook(config, webhookUrl);
    } catch {
      // webhook can be set later; QR is the priority
    }
  }
  const connect = await connectEvolutionInstance(config);
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { evolutionInstance: instance, evolutionStatus: parseEvolutionState(connect) || "connecting" },
  });
  return { instance, qr: extractQrBase64(connect) };
}
