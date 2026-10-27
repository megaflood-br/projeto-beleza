import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { SalonSupplierBoard } from "@/components/fornecedores/catalog-board";
import { toSupplierOrderRow, catalogPayMethods } from "@/lib/supplier-order-view";
import { loadRegionalSupplierGoods } from "@/lib/supplier-region";
import { applySupplierPromo } from "@/lib/supplier-promo";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  const params = await searchParams;
  const [{ products, deals, today }, orders] = await Promise.all([
    loadRegionalSupplierGoods(tenant.city),
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

  return (
    <SalonSupplierBoard
      salonCity={tenant.city}
      initialQuery={params.q ?? ""}
      deals={deals.flatMap((deal) =>
        deal.productIds
          .map((productId) => products.find((product) => product.id === productId))
          .filter(Boolean)
          .map((product) => ({
            id: deal.id,
            name: deal.name,
            label: applySupplierPromo([deal], product!.id, product!.priceCents, product!.minQty, today).label ?? deal.name,
            supplierName: product!.tenant.name,
            productName: product!.name,
            query: product!.name,
          })),
      )}
      products={products.map((product) => {
        const rule = deals.find((deal) => deal.productIds.includes(product.id));
        const priced = applySupplierPromo(deals, product.id, product.priceCents, product.minQty, today);
        return {
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
          promo: priced.promoName && rule
            ? {
                id: rule.id,
                name: priced.promoName,
                label: priced.label ?? priced.promoName,
                dealType: rule.dealType,
                priceCents: priced.unitCents,
                buyQty: rule.buyQty,
                payQty: rule.payQty,
              }
            : null,
        };
      })}
      orders={orders.map(toSupplierOrderRow)}
    />
  );
}
