import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { StockBoard } from "@/components/estoque/stock-board";

export default async function EstoquePage() {
  const { session } = await requireTenant();
  const [products, categories, services, lots, requests, professionals] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId: session.tenantId },
      include: { category: true, services: { include: { service: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.productCategory.findMany({ where: { tenantId: session.tenantId }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productLot.findMany({
      where: { tenantId: session.tenantId },
      include: { product: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.productRequest.findMany({
      where: { tenantId: session.tenantId },
      include: { product: true, professional: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const brands = [...new Set(products.map((p) => p.brand).filter((name): name is string => Boolean(name)))];

  return (
    <StockBoard
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      brands={brands}
      services={services}
      professionals={professionals}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand,
        categoryId: p.categoryId,
        categoryName: p.category?.name ?? null,
        unit: p.unit,
        unitEquals: p.unitEquals,
        costCents: p.costCents,
        saleCents: p.saleCents,
        professionalPriceCents: p.professionalPriceCents,
        extraCostCents: p.extraCostCents,
        commissionPct: p.commissionPct,
        cashbackPct: p.cashbackPct,
        returnAfterDays: p.returnAfterDays,
        stock: p.stock,
        minStock: p.minStock,
        imageUrl: p.imageUrl,
        notes: p.notes,
        requestAvailable: p.requestAvailable,
        active: p.active,
        services: p.services.map((row) => ({
          serviceId: row.serviceId,
          quantity: row.quantity,
          name: row.service.name,
        })),
      }))}
      lots={lots.map((lot) => ({
        id: lot.id,
        productId: lot.productId,
        productName: lot.product.name,
        brand: lot.product.brand,
        code: lot.code,
        quantity: lot.quantity,
        unit: lot.product.unit,
        expiresAt: lot.expiresAt.toISOString(),
      }))}
      requests={requests.map((req) => ({
        id: req.id,
        productId: req.productId,
        productName: req.product.name,
        professionalId: req.professionalId,
        professionalName: req.professional?.name ?? null,
        quantity: req.quantity,
        unit: req.product.unit,
        status: req.status,
        notes: req.notes,
        createdAt: req.createdAt.toISOString(),
      }))}
    />
  );
}
