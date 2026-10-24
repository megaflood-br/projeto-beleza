import { requirePlatformAdmin } from "@/lib/tenant";
import { listPlatformPlans, parsePlanFeatures, type PlanInterval } from "@/lib/plans";
import { prisma } from "@/lib/db";
import { PlanBoard } from "@/components/plataforma/plan-board";
import type { PlatformPlanRow } from "@/components/plataforma/plan-types";

export default async function PlataformaPlanosPage() {
  await requirePlatformAdmin();
  const plans = await listPlatformPlans();
  const usage = await prisma.tenant.groupBy({
    by: ["plan"],
    where: { isPlatform: false },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(usage.map((row) => [row.plan, row._count._all]));

  const rows: PlatformPlanRow[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    priceCents: plan.priceCents,
    interval: plan.interval as PlanInterval,
    trialDays: plan.trialDays,
    features: parsePlanFeatures(plan.features),
    active: plan.active,
    highlighted: plan.highlighted,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
    accounts: counts[plan.slug] ?? 0,
  }));

  return <PlanBoard plans={rows} />;
}
