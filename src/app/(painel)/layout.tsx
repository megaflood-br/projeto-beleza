import { requireTenant } from "@/lib/tenant";
import { AppShell } from "@/components/app-shell";
import { listPlatformPlans, planLabel } from "@/lib/plans";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant } = await requireTenant();
  const catalog = await listPlatformPlans();
  return (
    <AppShell
      salon={tenant.name}
      userName={session.name}
      plan={planLabel(tenant.plan, catalog)}
      impersonatorName={session.impersonatorName}
    >
      {children}
    </AppShell>
  );
}
