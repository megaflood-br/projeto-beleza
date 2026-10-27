import { requireSupplier } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { SupplierOrdersBoard } from "@/components/fornecedor/orders-board";
import { toSupplierOrderRow } from "@/lib/supplier-order-view";

export default async function FornecedorPedidosPage() {
  const { session } = await requireSupplier();
  const orders = await prisma.supplierOrder.findMany({
    where: { supplierTenantId: session.tenantId },
    include: {
      salonTenant: { select: { name: true } },
      supplierTenant: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return <SupplierOrdersBoard orders={orders.map(toSupplierOrderRow)} actor="supplier" />;
}
