import { prisma } from "@/lib/db";
import { publicAppOrigin } from "@/lib/public-url";
import { DEFAULT_META_GRAPH_VERSION } from "@/lib/whatsapp-meta";

export const INTEGRATION_TABS = [
  { id: "openai", label: "OpenAI", description: "Chave usada pelo assistente de todos os salões." },
  { id: "contora", label: "Contora", description: "Token fiscal da software house para NFS-e e NFC-e." },
  { id: "evolution", label: "WhatsApp Evolution", description: "Servidor Evolution (QR Code) usado pelos salões." },
  { id: "meta", label: "WhatsApp oficial", description: "App Secret da Meta para validar o webhook da Cloud API." },
  { id: "asaas", label: "Asaas", description: "Cobrança recorrente dos planos e comissão vitalícia dos parceiros." },
] as const;

export type IntegrationTab = (typeof INTEGRATION_TABS)[number]["id"];

export function isIntegrationTab(value: string | undefined): value is IntegrationTab {
  return INTEGRATION_TABS.some((tab) => tab.id === value);
}

export function parseIntegrationTab(value?: string | null): IntegrationTab {
  return value && isIntegrationTab(value) ? value : "openai";
}

export type PlatformIntegrations = {
  openaiApiKey: string;
  contoraApiToken: string;
  evolutionUrl: string;
  evolutionApiKey: string;
  publicAppUrl: string;
  metaAppSecret: string;
  metaGraphVersion: string;
  hasOpenAi: boolean;
  hasContora: boolean;
  hasEvolution: boolean;
  hasMeta: boolean;
  hasAsaas: boolean;
};

export async function resolvePlatformIntegrations(): Promise<PlatformIntegrations> {
  const hq = await prisma.tenant.findFirst({
    where: { isPlatform: true },
    select: {
      openaiApiKey: true,
      contoraApiToken: true,
      evolutionUrl: true,
      evolutionApiKey: true,
      publicAppUrl: true,
      asaasApiKey: true,
      metaAppSecret: true,
      metaGraphVersion: true,
    },
  });
  const openaiApiKey = hq?.openaiApiKey || process.env.OPENAI_API_KEY || "";
  const contoraApiToken = hq?.contoraApiToken || process.env.CONTORA_API_TOKEN || "";
  const evolutionUrl = hq?.evolutionUrl || process.env.EVOLUTION_API_URL || "";
  const evolutionApiKey = hq?.evolutionApiKey || process.env.EVOLUTION_API_KEY || "";
  const publicAppUrl = publicAppOrigin(hq?.publicAppUrl || process.env.APP_URL || "");
  const asaasApiKey = hq?.asaasApiKey || process.env.ASAAS_API_KEY || "";
  const metaAppSecret = hq?.metaAppSecret || process.env.META_APP_SECRET || "";
  const metaGraphVersion = hq?.metaGraphVersion || process.env.META_GRAPH_VERSION || DEFAULT_META_GRAPH_VERSION;
  return {
    openaiApiKey,
    contoraApiToken,
    evolutionUrl,
    evolutionApiKey,
    publicAppUrl,
    metaAppSecret,
    metaGraphVersion,
    hasOpenAi: Boolean(openaiApiKey),
    hasContora: Boolean(contoraApiToken),
    hasEvolution: Boolean(evolutionUrl && evolutionApiKey),
    hasMeta: Boolean(metaAppSecret),
    hasAsaas: Boolean(asaasApiKey),
  };
}

export function instanceNameForTenant(slug: string) {
  const clean = slug.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `mb-${clean || "salao"}`.slice(0, 48);
}

export function evolutionWebhookUrl(publicAppUrl: string, slug: string) {
  const origin = publicAppOrigin(publicAppUrl, false);
  if (!origin) return "";
  return `${origin}/api/webhooks/evolution?tenant=${encodeURIComponent(slug)}`;
}

export function metaWebhookUrl(publicAppUrl: string, slug: string) {
  const origin = publicAppOrigin(publicAppUrl, false);
  if (!origin) return "";
  return `${origin}/api/webhooks/meta?tenant=${encodeURIComponent(slug)}`;
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-2)}`;
}
