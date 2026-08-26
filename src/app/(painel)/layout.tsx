import { requireTenant } from "@/lib/tenant";
import { AppShell } from "@/components/app-shell";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant } = await requireTenant();
  return (
    <AppShell salon={tenant.name} userName={session.name} plan={tenant.plan}>
      {children}
    </AppShell>
  );
}
