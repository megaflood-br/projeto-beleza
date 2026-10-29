import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { tenantCashbackConfig } from "@/lib/cashback";
import { parseSettingsTab } from "@/lib/settings";
import { SettingsBoard } from "@/components/configuracoes/settings-board";
import { tenantFiscalConfig } from "@/lib/fiscal";
import { maskSecret, resolvePlatformIntegrations } from "@/lib/integrations";

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  const params = await searchParams;
  const fiscal = tenantFiscalConfig(tenant);
  const integrations = await resolvePlatformIntegrations();
  return (
    <SettingsBoard
      tab={parseSettingsTab(params.tab)}
      salon={{
        name: tenant.name,
        tradeName: tenant.tradeName,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        city: tenant.city,
        openTime: tenant.openTime,
        closeTime: tenant.closeTime,
        reminderHours: tenant.reminderHours,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl ?? "",
        technicalResponsible: tenant.technicalResponsible ?? "",
        technicalRegistry: tenant.technicalRegistry ?? "",
      }}
      cashback={tenantCashbackConfig(tenant)}
      fiscal={{
        ...fiscal,
        hasPlatformToken: integrations.hasContora,
        cscTokenMasked: tenant.fiscalCscToken ? maskSecret(tenant.fiscalCscToken) : "",
      }}
      canImport={canManageTeam(session.role)}
    />
  );
}
