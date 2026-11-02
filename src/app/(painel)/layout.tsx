import { headers } from "next/headers";
import { requireTenant } from "@/lib/tenant";
import { AppShell } from "@/components/app-shell";
import { listPlatformPlans, planLabel } from "@/lib/plans";
import { loadSalonNotices } from "@/lib/salon-notices";
import { allowedNavHrefs, canAccess, moduleFromPath } from "@/lib/permissions";

const NAV_HREFS = [
  "/dashboard",
  "/ia",
  "/atendimento",
  "/recepcionista",
  "/agenda",
  "/comandas",
  "/clientes",
  "/anamneses",
  "/documentacao",
  "/equipe",
  "/usuarios",
  "/permissoes",
  "/metas",
  "/comissoes",
  "/financeiro",
  "/notas",
  "/estoque",
  "/servicos",
  "/promocoes",
  "/fornecedores",
  "/marketing",
  "/cadastros",
  "/suporte",
  "/configuracoes",
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant, access } = await requireTenant();
  const [catalog, notices, headerList] = await Promise.all([
    listPlatformPlans(),
    loadSalonNotices(session.tenantId, tenant.city),
    headers(),
  ]);
  const pathname = headerList.get("x-pathname") || "";
  const module = moduleFromPath(pathname);
  const allowed = module ? canAccess(access, module) : true;
  return (
    <AppShell
      salon={tenant.name}
      userName={session.name}
      plan={planLabel(tenant.plan, catalog)}
      impersonatorName={session.impersonatorName}
      noticeCount={notices.noticeCount}
      allowedHrefs={allowedNavHrefs(access, NAV_HREFS)}
    >
      {allowed ? (
        children
      ) : (
        <div className="rounded-xl border border-line bg-paper p-8 text-sm text-ink-soft">
          Sem permissão para abrir esta área. Peça ao proprietário para liberar o acesso em Permissões.
        </div>
      )}
    </AppShell>
  );
}
