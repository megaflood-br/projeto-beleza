import { requireSupplier } from "@/lib/tenant";
import { SupplierCompanyForm } from "@/components/fornecedor/company-form";
import { parseSupplierPayMethods } from "@/lib/supplier-market";

export default async function FornecedorEmpresaPage() {
  const { tenant } = await requireSupplier();
  return (
    <SupplierCompanyForm
      company={{
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        city: tenant.city,
        address: tenant.address,
        deliveryMinCents: tenant.deliveryMinCents,
        deliveryFeeCents: tenant.deliveryFeeCents,
        payMethods: parseSupplierPayMethods(tenant.supplierPayMethods),
      }}
    />
  );
}
