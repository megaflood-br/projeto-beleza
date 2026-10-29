import { prisma } from "@/lib/db";
import { publicAppOrigin } from "@/lib/public-url";

export const INTEGRATION_TABS = [
  { id: "openai", label: "OpenAI", description: "Chave usada pelo assistente de todos os salões." },
  { id: "contora", label: "Contora", description: "Token fiscal da software house para NFS-e e NFC-e." },
  { id: "evolution", label: "WhatsApp", description: "Servidor Evolution e webhook usados por todos os salões." },
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
  hasOpenAi: boolean;
  hasContora: boolean;
  hasEvolution: boolean;
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
    },
  });
  const openaiApiKey = hq?.openaiApiKey || process.env.OPENAI_API_KEY || "";
  const contoraApiToken = hq?.contoraApiToken || process.env.CONTORA_API_TOKEN || "";
  const evolutionUrl = hq?.evolutionUrl || process.env.EVOLUTION_API_URL || "";
  const evolutionApiKey = hq?.evolutionApiKey || process.env.EVOLUTION_API_KEY || "";
  const publicAppUrl = publicAppOrigin(hq?.publicAppUrl || process.env.APP_URL || "");
  return {
    openaiApiKey,
    contoraApiToken,
    evolutionUrl,
    evolutionApiKey,
    publicAppUrl,
    hasOpenAi: Boolean(openaiApiKey),
    hasContora: Boolean(contoraApiToken),
    hasEvolution: Boolean(evolutionUrl && evolutionApiKey),
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

export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-2)}`;
}
