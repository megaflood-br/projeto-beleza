import { requireTenant } from "@/lib/tenant";
import { tenantCashbackConfig } from "@/lib/cashback";
import { parseSettingsTab } from "@/lib/settings";
import { SettingsBoard } from "@/components/configuracoes/settings-board";
import { tenantFiscalConfig } from "@/lib/fiscal";
import { maskSecret } from "@/lib/integrations";

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tenant } = await requireTenant();
  const params = await searchParams;
  const fiscal = tenantFiscalConfig(tenant);
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
      }}
      cashback={tenantCashbackConfig(tenant)}
      fiscal={{
        ...fiscal,
        tokenMasked: tenant.fiscalProviderToken ? maskSecret(tenant.fiscalProviderToken) : "",
      }}
    />
  );
}
