import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { SalonSupplierBoard } from "@/components/fornecedores/catalog-board";
import { toSupplierOrderRow, catalogPayMethods } from "@/lib/supplier-order-view";
import { supplierServesSalon } from "@/lib/br-cities";

export default async function FornecedoresPage() {
  const { session, tenant } = await requireTenant();
  const [products, orders] = await Promise.all([
    prisma.supplierProduct.findMany({
      where: { active: true, tenant: { kind: "SUPPLIER", status: { not: "SUSPENDED" } } },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            deliveryMinCents: true,
            deliveryFeeCents: true,
            supplierPayMethods: true,
            servedCities: true,
          },
        },
      },
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

  const regional = products.filter((product) => supplierServesSalon(product.tenant.servedCities, tenant.city));

  return (
    <SalonSupplierBoard
      salonCity={tenant.city}
      products={regional.map((product) => ({
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
        imageUrl: product.imageUrl,
        active: product.active,
        supplierId: product.tenant.id,
        supplierName: product.tenant.name,
        supplierCity: product.tenant.city,
        supplierAddress: [product.tenant.address, product.tenant.city].filter(Boolean).join(" · ") || null,
        deliveryMinCents: product.tenant.deliveryMinCents,
        deliveryFeeCents: product.tenant.deliveryFeeCents,
        payMethods: catalogPayMethods(product.tenant.supplierPayMethods),
      }))}
      orders={orders.map(toSupplierOrderRow)}
    />
  );
}
