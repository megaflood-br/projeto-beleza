"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { chatWithSalonContext, fallbackInsight } from "@/lib/openai";
import { formatBRL } from "@/lib/money";
import { occupancyPercent } from "@/lib/appointments";
import { rangeOfDay } from "@/lib/dates";
import { isLowStock } from "@/lib/stock";

export async function askAssistant(question: string) {
  const { session, tenant } = await requireTenant();
  const { start, end } = rangeOfDay(new Date());

  const [appointments, income, products] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: session.tenantId, startAt: { gte: start, lt: end } },
      include: { items: true, professional: true, client: true },
    }),
    prisma.transaction.aggregate({
      where: { tenantId: session.tenantId, type: "INCOME", occurredAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.product.findMany({ where: { tenantId: session.tenantId, active: true } }),
  ]);

  const busy = appointments
    .filter((a) => a.status !== "CANCELLED")
    .reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60000, 0);
  const occupancy = occupancyPercent(busy, 4 * 10 * 60);
  const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;
  const lowStock = products.filter((p) => isLowStock(p.stock, p.minStock)).length;

  const context = [
    `Salão: ${tenant.name}`,
    `Faturamento de hoje: ${formatBRL(income._sum.amountCents ?? 0)}`,
    `Agendamentos hoje: ${appointments.length}`,
    `Ocupação estimada: ${occupancy}%`,
    `No-shows: ${noShows}`,
    `Produtos no mínimo: ${lowStock}`,
    `Agenda: ${appointments
      .map(
        (a) =>
          `${a.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ${a.client.name} com ${a.professional.name} (${a.status})`,
      )
      .join("; ")}`,
  ].join("\n");

  if (!question.trim()) {
    return {
      source: "local" as const,
      answer: fallbackInsight({
        revenueCents: income._sum.amountCents ?? 0,
        appointments: appointments.length,
        occupancy,
        noShows,
        lowStock,
      }),
    };
  }

  return chatWithSalonContext({
    apiKey: tenant.openaiApiKey,
    question,
    context,
  });
}
