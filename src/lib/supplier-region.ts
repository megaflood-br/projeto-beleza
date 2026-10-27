import { prisma } from "@/lib/db";
import { supplierServesSalon } from "@/lib/br-cities";
import { calendarDate } from "@/lib/dates";
import { activeSupplierPromos, toSupplierPromoRule } from "@/lib/supplier-promo";

export async function loadRegionalSupplierGoods(salonCity: string | null) {
  const [products, promotions] = await Promise.all([
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
    prisma.supplierPromotion.findMany({
      where: { active: true, tenant: { kind: "SUPPLIER", status: { not: "SUSPENDED" } } },
      include: {
        items: true,
        tenant: { select: { name: true, servedCities: true } },
      },
    }),
  ]);
  const regional = products.filter((product) => supplierServesSalon(product.tenant.servedCities, salonCity));
  const today = calendarDate();
  const deals = promotions
    .filter((promo) => supplierServesSalon(promo.tenant.servedCities, salonCity))
    .map(toSupplierPromoRule)
    .filter((rule) => activeSupplierPromos([rule], today).length > 0);
  return { products: regional, deals, today };
}
