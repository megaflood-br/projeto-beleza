"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/money";
import { calendarMonth, monthStartEnd, parseDateParam } from "@/lib/dates";
import { goalMetricMeta, isGoalMetric } from "@/lib/goals";

function revalidateGoals() {
  revalidatePath("/metas");
  revalidatePath("/equipe");
  revalidatePath("/comissoes");
}

function parseTarget(metric: string, raw: string) {
  const unit = goalMetricMeta(metric).unit;
  if (unit === "money") return Math.max(0, parseBRLToCents(raw));
  const count = Number(String(raw).replace(/[^\d]/g, ""));
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

export async function saveProfessionalGoal(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "");
  const metric = String(formData.get("metric") ?? "REVENUE");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const applyAll = String(formData.get("applyAll") ?? "") === "1";
  const startDate = parseDateParam(String(formData.get("startDate") ?? ""));
  const endDate = parseDateParam(String(formData.get("endDate") ?? ""));
  const range = startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };

  if (!isGoalMetric(metric)) return { error: "Tipo de meta inválido." };
  const targetValue = parseTarget(metric, String(formData.get("targetValue") ?? ""));
  if (targetValue <= 0) return { error: "Informe um valor de meta maior que zero." };

  const professionals = applyAll
    ? await prisma.professional.findMany({
        where: { tenantId: session.tenantId, active: true },
        select: { id: true },
      })
    : professionalId
      ? await prisma.professional.findMany({
          where: { id: professionalId, tenantId: session.tenantId },
          select: { id: true },
        })
      : [];

  if (!professionals.length) return { error: "Selecione um profissional." };

  for (const professional of professionals) {
    const existing =
      (id && !applyAll
        ? await prisma.professionalGoal.findFirst({ where: { id, tenantId: session.tenantId } })
        : null) ??
      (await prisma.professionalGoal.findFirst({
        where: {
          tenantId: session.tenantId,
          professionalId: professional.id,
          metric,
          startDate: range.startDate,
          endDate: range.endDate,
        },
      }));

    const data = {
      professionalId: professional.id,
      metric,
      targetValue,
      startDate: range.startDate,
      endDate: range.endDate,
      notes,
    };

    if (existing) {
      await prisma.professionalGoal.update({ where: { id: existing.id }, data });
    } else {
      await prisma.professionalGoal.create({
        data: { tenantId: session.tenantId, ...data },
      });
    }
  }

  revalidateGoals();
  return { ok: true as const };
}

export async function deleteProfessionalGoal(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const goal = await prisma.professionalGoal.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!goal) return { error: "Meta não encontrada." };
  await prisma.professionalGoal.delete({ where: { id: goal.id } });
  revalidateGoals();
  return { ok: true as const };
}

export async function copyGoalsFromPreviousMonth(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };
  const month = calendarMonth(String(formData.get("month") ?? ""));
  const current = monthStartEnd(month);
  const previous = monthStartEnd(String(formData.get("fromMonth") ?? ""));
  const source = await prisma.professionalGoal.findMany({
    where: {
      tenantId: session.tenantId,
      startDate: previous.from,
      endDate: previous.to,
    },
  });
  if (!source.length) return { error: "Não há metas no período anterior para copiar." };

  for (const goal of source) {
    await prisma.professionalGoal.upsert({
      where: {
        tenantId_professionalId_metric_startDate_endDate: {
          tenantId: session.tenantId,
          professionalId: goal.professionalId,
          metric: goal.metric,
          startDate: current.from,
          endDate: current.to,
        },
      },
      update: { targetValue: goal.targetValue, notes: goal.notes },
      create: {
        tenantId: session.tenantId,
        professionalId: goal.professionalId,
        metric: goal.metric,
        targetValue: goal.targetValue,
        startDate: current.from,
        endDate: current.to,
        notes: goal.notes,
      },
    });
  }

  revalidateGoals();
  return { ok: true as const, copied: source.length };
}
