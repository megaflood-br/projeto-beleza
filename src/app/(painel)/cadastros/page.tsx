import { requireTenant } from "@/lib/tenant";
import { canAccess } from "@/lib/permissions";
import { loadFinanceCatalog } from "@/lib/finance-catalog";
import { CadastrosBoard } from "@/components/cadastros/cadastros-board";

export default async function CadastrosPage() {
  const { session, access } = await requireTenant();
  if (!canAccess(access, "finance")) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Cadastros</h1>
        <p className="text-ink-soft">Somente administradores acessam contas e formas de pagamento.</p>
      </div>
    );
  }
  const catalog = await loadFinanceCatalog(session.tenantId);
  return <CadastrosBoard accounts={catalog.accounts} methods={catalog.methods} categories={catalog.categories} />;
}
