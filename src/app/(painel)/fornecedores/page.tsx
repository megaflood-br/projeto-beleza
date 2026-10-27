import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { SalonSupplierBoard } from "@/components/fornecedores/catalog-board";
import type { SupplierOrderRow } from "@/components/fornecedor/types";

export default async function FornecedoresPage() {
  const { session } = await requireTenant();
  const [products, orders] = await Promise.all([
    prisma.supplierProduct.findMany({
      where: { active: true, tenant: { kind: "SUPPLIER", status: { not: "SUSPENDED" } } },
      include: { tenant: { select: { id: true, name: true, city: true } } },
      orderBy: [{ tenant: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.supplierOrder.findMany({
      where: { salonTenantId: session.tenantId },
      include: {
        salonTenant: { select: { name: true } },
        supplierTenant: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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

  return (
    <SalonSupplierBoard
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        priceCents: product.priceCents,
        minQty: product.minQty,
        stock: product.stock,
        description: product.description,
        active: product.active,
        supplierId: product.tenant.id,
        supplierName: product.tenant.name,
        supplierCity: product.tenant.city,
      }))}
      orders={rows}
    />
  );
}
