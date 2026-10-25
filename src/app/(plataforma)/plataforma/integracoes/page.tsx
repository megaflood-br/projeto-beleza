import { requirePlatformAdmin } from "@/lib/tenant";
import { maskSecret, parseIntegrationTab } from "@/lib/integrations";
import { IntegrationsBoard } from "@/components/plataforma/integrations-board";

export default async function PlataformaIntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tenant } = await requirePlatformAdmin();
  const params = await searchParams;
  return (
    <IntegrationsBoard
      tab={parseIntegrationTab(params.tab)}
      value={{
        openaiMasked: tenant.openaiApiKey ? maskSecret(tenant.openaiApiKey) : "",
        contoraMasked: tenant.contoraApiToken ? maskSecret(tenant.contoraApiToken) : "",
        evolutionUrl: tenant.evolutionUrl,
        evolutionMasked: tenant.evolutionApiKey ? maskSecret(tenant.evolutionApiKey) : "",
        publicAppUrl: tenant.publicAppUrl,
        hasOpenAi: Boolean(tenant.openaiApiKey),
        hasContora: Boolean(tenant.contoraApiToken),
        hasEvolution: Boolean(tenant.evolutionUrl && tenant.evolutionApiKey),
      }}
    />
  );
}
