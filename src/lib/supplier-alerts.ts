import { foldCity } from "@/lib/br-cities";
import { effectiveMinStock, isLowStock } from "@/lib/stock";

export function productsLookAlike(
  salon: { name: string; brand?: string | null },
  catalog: { name: string; brand?: string | null },
) {
  const salonName = foldCity(salon.name);
  const catalogName = foldCity(catalog.name);
  if (!salonName || !catalogName) return false;
  if (salonName === catalogName) return true;
  const salonBrand = foldCity(salon.brand ?? "");
  const catalogBrand = foldCity(catalog.brand ?? "");
  const brandOk = !salonBrand || !catalogBrand || salonBrand === catalogBrand;
  if (!brandOk) return false;
  const shorter = salonName.length <= catalogName.length ? salonName : catalogName;
  const longer = salonName.length <= catalogName.length ? catalogName : salonName;
  return shorter.length >= 4 && longer.includes(shorter);
}

export function buildLowStockAlerts<
  TSalon extends { id: string; name: string; brand?: string | null; stock: number; minStock: number; unit: string; active?: boolean },
  TOffer extends { id: string; name: string; brand?: string | null; supplierName: string; priceCents: number },
>(salonProducts: TSalon[], offers: TOffer[]) {
  return salonProducts
    .filter((product) => product.active !== false && isLowStock(product.stock, product.minStock))
    .map((product) => {
      const offer = offers.find((item) => productsLookAlike(product, item)) ?? null;
      return {
        productId: product.id,
        name: product.name,
        stock: product.stock,
        minStock: effectiveMinStock(product.minStock),
        unit: product.unit,
        supplierName: offer?.supplierName ?? null,
        supplierPriceCents: offer?.priceCents ?? null,
        query: product.name,
      };
    });
}
