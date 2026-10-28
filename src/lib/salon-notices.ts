import { prisma } from "@/lib/db";
import { applySupplierPromo } from "@/lib/supplier-promo";
import { buildLowStockAlerts } from "@/lib/supplier-alerts";
import { loadRegionalSupplierGoods } from "@/lib/supplier-region";
import type { LowStockAlertItem, SupplierDealCard } from "@/components/avisos/salon-alerts";

export function dealCardsFromRegional(regional: Awaited<ReturnType<typeof loadRegionalSupplierGoods>>): SupplierDealCard[] {
  return regional.deals.flatMap((deal) =>
    deal.productIds
      .map((productId) => regional.products.find((product) => product.id === productId))
      .filter(Boolean)
      .map((product) => ({
        id: deal.id,
        name: deal.name,
        label: applySupplierPromo([deal], product!.id, product!.priceCents, product!.minQty, regional.today).label ?? deal.name,
        supplierName: product!.tenant.name,
        productName: product!.name,
        query: product!.name,
      })),
  );
}

export async function loadSalonNotices(tenantId: string, salonCity: string | null) {
  const [stockProducts, regional] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, brand: true, stock: true, minStock: true, unit: true, active: true },
    }),
    loadRegionalSupplierGoods(salonCity),
  ]);
  const restock: LowStockAlertItem[] = buildLowStockAlerts(
    stockProducts,
    regional.products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      supplierName: product.tenant.name,
      priceCents: product.priceCents,
    })),
  );
  const deals = dealCardsFromRegional(regional);
  return {
    city: salonCity,
    restock,
    deals,
    regional,
    noticeCount: restock.length + deals.length + (salonCity ? 0 : 1),
  };
}
