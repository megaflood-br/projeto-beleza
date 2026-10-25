import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { calendarDate, shiftCalendarDate, zonedDateTime } from "@/lib/dates";
import { toPromoRule, weekdayFromCalendarDate, weekdayHeat } from "@/lib/promotions";
import { PromoBoard } from "@/components/promocoes/promo-board";

export default async function PromocoesPage() {
  const { session } = await requireTenant();
  const canManage = canSeeFinance(session.role);
  const today = calendarDate();
  const from = zonedDateTime(shiftCalendarDate(today, -56), "00:00");

  const [promotions, services, products, comandas] = await Promise.all([
    prisma.promotion.findMany({
      where: { tenantId: session.tenantId },
      include: { items: { include: { service: true, product: true } } },
      orderBy: { startsOn: "desc" },
    }),
    prisma.service.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceCents: true },
    }),
    prisma.product.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, saleCents: true },
    }),
    prisma.comanda.findMany({
      where: { tenantId: session.tenantId, status: "CLOSED", closedAt: { gte: from } },
      select: { closedAt: true, occurredAt: true },
    }),
  ]);

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const comanda of comandas) {
    const date = calendarDate(comanda.closedAt ?? comanda.occurredAt);
    counts[weekdayFromCalendarDate(date)] += 1;
  }

  return (
    <PromoBoard
      canManage={canManage}
      heat={weekdayHeat(counts)}
      services={services}
      products={products.map((product) => ({ id: product.id, name: product.name, priceCents: product.saleCents }))}
      promotions={promotions.map((promo) => {
        const rule = toPromoRule(promo);
        return {
          ...rule,
          items: promo.items.map((item) => ({
            type: item.type,
            id: item.serviceId ?? item.productId ?? "",
            name: item.service?.name ?? item.product?.name ?? "Item",
          })),
        };
      })}
    />
  );
}
