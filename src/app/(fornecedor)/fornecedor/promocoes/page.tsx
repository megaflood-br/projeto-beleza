import { requireSupplier } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { SupplierPromoBoard } from "@/components/fornecedor/promo-board";
import { toSupplierPromoRule } from "@/lib/supplier-promo";

export default async function FornecedorPromocoesPage() {
  const { session } = await requireSupplier();
  const [promotions, products] = await Promise.all([
    prisma.supplierPromotion.findMany({
      where: { tenantId: session.tenantId },
      include: { items: true },
      orderBy: { startsOn: "desc" },
    }),
    prisma.supplierProduct.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <SupplierPromoBoard
      promotions={promotions.map(toSupplierPromoRule)}
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
        imageUrl: product.imageUrl,
        active: product.active,
      }))}
    />
  );
}
