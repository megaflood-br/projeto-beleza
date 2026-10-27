import { requireSupplier } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { SupplierProductBoard } from "@/components/fornecedor/product-board";

export default async function FornecedorProdutosPage() {
  const { session } = await requireSupplier();
  const products = await prisma.supplierProduct.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { name: "asc" },
  });
  return (
    <SupplierProductBoard
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
