import { prisma } from "@/lib/db";
import { toPromoRule, type PromoRule } from "@/lib/promotions";

export async function loadPromoRules(tenantId: string): Promise<PromoRule[]> {
  const rows = await prisma.promotion.findMany({
    where: { tenantId, active: true },
    include: { items: true },
  });
  return rows.map(toPromoRule);
}
