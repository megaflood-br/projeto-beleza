import { requireTenant } from "@/lib/tenant";
import { AppShell } from "@/components/app-shell";
import { listPlatformPlans, planLabel } from "@/lib/plans";
import { loadSalonNotices } from "@/lib/salon-notices";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant } = await requireTenant();
  const [catalog, notices] = await Promise.all([
    listPlatformPlans(),
    loadSalonNotices(session.tenantId, tenant.city),
  ]);
  return (
    <AppShell
      salon={tenant.name}
      userName={session.name}
      plan={planLabel(tenant.plan, catalog)}
      impersonatorName={session.impersonatorName}
      noticeCount={notices.noticeCount}
    >
      {children}
    </AppShell>
  );
}
