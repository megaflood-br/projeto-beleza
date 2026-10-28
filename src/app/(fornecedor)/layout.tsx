import { requireSupplier } from "@/lib/tenant";
import { SupplierShell } from "@/components/fornecedor/supplier-shell";

export default async function FornecedorLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant } = await requireSupplier();
  return (
    <SupplierShell company={tenant.name} userName={session.name} impersonatorName={session.impersonatorName}>
      {children}
    </SupplierShell>
  );
}
