import { requireTenant } from "@/lib/tenant";
import { loadSalonNotices } from "@/lib/salon-notices";
import { LowStockAlert, SalonCityHint, SupplierDealStrip } from "@/components/avisos/salon-alerts";

export default async function AvisosPage() {
  const { tenant } = await requireTenant();
  const notices = await loadSalonNotices(tenant.id, tenant.city);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Avisos</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Estoque baixo e ofertas dos fornecedores da sua região. Sem toast: o aviso fica aqui até você agir.
        </p>
      </div>
      <SalonCityHint city={notices.city} />
      <LowStockAlert items={notices.restock} always />
      <SupplierDealStrip deals={notices.deals} always salonCity={notices.city} />
    </div>
  );
}
