import { requireSupplier } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { SupplierOrdersBoard } from "@/components/fornecedor/orders-board";
import type { SupplierOrderRow } from "@/components/fornecedor/types";

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
  const rows: SupplierOrderRow[] = orders.map((order) => ({
    id: order.id,
    status: order.status,
    notes: order.notes,
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    receivedAt: order.receivedAt?.toISOString() ?? null,
    salonName: order.salonTenant.name,
    supplierName: order.supplierTenant.name,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      quantity: item.quantity,
      unit: item.unit,
      unitCents: item.unitCents,
      lineCents: item.lineCents,
    })),
  }));
  return <SupplierOrdersBoard orders={rows} actor="supplier" />;
}
