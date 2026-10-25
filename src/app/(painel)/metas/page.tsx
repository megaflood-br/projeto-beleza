import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { calendarDate, monthStartEnd, parseMonthParam } from "@/lib/dates";
import { rangeBounds } from "@/lib/dashboard";
import {
  currentForMetric,
  expectedPacePct,
  goalProgress,
  professionalFacts,
  type GoalFactItem,
} from "@/lib/goals";
import { GoalsBoard } from "@/components/metas/goals-board";
import type { GoalCard, GoalRow } from "@/components/metas/types";

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const { from, to } = monthStartEnd(month);
  const bounds = rangeBounds(from, to);
  const today = calendarDate();
  const pacePct = expectedPacePct(from, to, today);

  const [professionals, goals, comandas, commissions] = await Promise.all([
    prisma.professional.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nickname: true, color: true, specialty: true, active: true },
    }),
    prisma.professionalGoal.findMany({
      where: {
        tenantId: session.tenantId,
        startDate: { lte: to },
        endDate: { gte: from },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.comanda.findMany({
      where: {
        tenantId: session.tenantId,
        status: "CLOSED",
        occurredAt: { gte: bounds.start, lt: bounds.end },
      },
      select: {
        id: true,
        clientId: true,
        professionalId: true,
        items: {
          select: {
            type: true,
            quantity: true,
            priceCents: true,
            discountCents: true,
            professionalId: true,
          },
        },
      },
    }),
    prisma.commission.findMany({
      where: { tenantId: session.tenantId, createdAt: { gte: bounds.start, lt: bounds.end } },
      select: { professionalId: true, amountCents: true },
    }),
  ]);

  const items: GoalFactItem[] = comandas.flatMap((comanda) =>
    comanda.items.map((item) => ({
      professionalId: item.professionalId,
      comandaProfessionalId: comanda.professionalId,
      comandaId: comanda.id,
      clientId: comanda.clientId,
      type: item.type,
      quantity: item.quantity,
      priceCents: item.priceCents,
      discountCents: item.discountCents,
    })),
  );

  const factsByPro = new Map(professionals.map((pro) => [pro.id, professionalFacts(items, commissions, pro.id)]));

  const cards: GoalCard[] = professionals.map((pro) => {
    const facts = factsByPro.get(pro.id)!;
    const rows: GoalRow[] = goals
      .filter((goal) => goal.professionalId === pro.id)
      .map((goal) => {
        const progress = goalProgress(goal.targetValue, currentForMetric(goal.metric, facts), pacePct);
        return {
          id: goal.id,
          professionalId: goal.professionalId,
          metric: goal.metric,
          targetValue: goal.targetValue,
          startDate: goal.startDate,
          endDate: goal.endDate,
          notes: goal.notes,
          current: progress.current,
          remaining: progress.remaining,
          pct: progress.pct,
          status: progress.status,
        };
      });
    return { ...pro, goals: rows };
  });

  return (
    <GoalsBoard
      month={month}
      from={from}
      to={to}
      cards={cards}
      professionals={professionals}
      canManage={canManageTeam(session.role)}
      pacePct={pacePct}
    />
  );
}
