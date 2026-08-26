import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { ServiceBoard } from "@/components/servicos/service-board";

export default async function ServicosPage() {
  const { session } = await requireTenant();
  const [services, categories, products] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: session.tenantId },
      include: { category: true, products: { include: { product: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCategory.findMany({ where: { tenantId: session.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ServiceBoard
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      products={products}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
        extraCostCents: s.extraCostCents,
        commissionPct: s.commissionPct,
        cashbackPct: s.cashbackPct,
        categoryId: s.categoryId,
        categoryName: s.category?.name ?? null,
        active: s.active,
        favorite: s.favorite,
        description: s.description,
        aftercare: s.aftercare,
        returnAfterDays: s.returnAfterDays,
        priceType: s.priceType,
        imageUrl: s.imageUrl,
        color: s.color,
        onlineBooking: s.onlineBooking,
        products: s.products.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          name: p.product.name,
        })),
      }))}
    />
  );
}
