import { requireSupplier } from "@/lib/tenant";
import { SupplierCompanyForm } from "@/components/fornecedor/company-form";
import { parseSupplierPayMethods } from "@/lib/supplier-market";
import { parseServedCities, resolveCityLabel } from "@/lib/br-cities";

export default async function FornecedorEmpresaPage() {
  const { tenant } = await requireSupplier();
  return (
    <SupplierCompanyForm
      company={{
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        city: resolveCityLabel(tenant.city),
        address: tenant.address,
        deliveryMinCents: tenant.deliveryMinCents,
        deliveryFeeCents: tenant.deliveryFeeCents,
        payMethods: parseSupplierPayMethods(tenant.supplierPayMethods),
        servedCities: parseServedCities(tenant.servedCities),
      }}
    />
  );
}
