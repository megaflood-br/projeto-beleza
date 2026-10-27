import { requireSupplier } from "@/lib/tenant";
import { SupplierCompanyForm } from "@/components/fornecedor/company-form";

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
      }}
    />
  );
}
