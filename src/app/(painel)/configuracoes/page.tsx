import { requireTenant } from "@/lib/tenant";
import { tenantCashbackConfig } from "@/lib/cashback";
import { parseSettingsTab } from "@/lib/settings";
import { SettingsBoard } from "@/components/configuracoes/settings-board";

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tenant } = await requireTenant();
  const params = await searchParams;
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
        openaiApiKey: tenant.openaiApiKey,
        slug: tenant.slug,
      }}
      cashback={tenantCashbackConfig(tenant)}
    />
  );
}
