"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { chatWithSalonContext, fallbackInsight } from "@/lib/openai";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { occupancyPercent } from "@/lib/appointments";
import { formatTime, rangeOfDay } from "@/lib/dates";
import {
  answerAssistantIntent,
  assistantIntent,
  formatAssistantContext,
  lowStockProducts,
  type AssistantSnapshot,
} from "@/lib/assistant";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";

function statusLabel(status: string) {
  return STATUS_LABEL[status as AppointmentStatus] ?? status;
}

export async function askAssistant(question: string) {
  const { session, tenant } = await requireTenant();
  const snapshot = await loadAssistantSnapshot(session.tenantId, tenant.name);
  const intent = assistantIntent(question);
  const fact = answerAssistantIntent(intent, snapshot);

  if (intent === "greeting") {
    return {
      source: "local" as const,
      answer: fallbackInsight({
        revenueCents: snapshot.revenueCents,
        appointments: snapshot.appointments.length,
        occupancy: snapshot.occupancy,
        noShows: snapshot.noShows,
        lowStock: lowStockProducts(snapshot.products).length,
        lowStockNames: lowStockProducts(snapshot.products).map((item) => item.name),
      }),
    };
  }

  if (fact) {
    return { source: "local" as const, answer: fact };
  }

  const integrations = await resolvePlatformIntegrations();
  return chatWithSalonContext({
    apiKey: integrations.openaiApiKey,
    question,
    context: formatAssistantContext(snapshot),
  });
}

async function loadAssistantSnapshot(tenantId: string, salon: string): Promise<AssistantSnapshot> {
  const { start, end } = rangeOfDay(new Date());
  const [appointments, income, products, professionals] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, startAt: { gte: start, lt: end } },
      include: { professional: true, client: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.transaction.aggregate({
      where: { tenantId, type: "INCOME", occurredAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.product.findMany({
      where: { tenantId, active: true },
      select: { name: true, stock: true, minStock: true, unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.professional.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const busy = appointments
    .filter((row) => row.status !== "CANCELLED")
    .reduce((sum, row) => sum + (row.endAt.getTime() - row.startAt.getTime()) / 60000, 0);
  const occupancy = occupancyPercent(busy, Math.max(professionals.length, 1) * 10 * 60);
  const counts = new Map<string, number>();
  for (const row of appointments) {
    if (row.status === "CANCELLED") continue;
    counts.set(row.professionalId, (counts.get(row.professionalId) ?? 0) + 1);
  }

  return {
    salon,
    revenueCents: income._sum.amountCents ?? 0,
    occupancy,
    noShows: appointments.filter((row) => row.status === "NO_SHOW").length,
    appointments: appointments.map((row) => ({
      time: formatTime(row.startAt),
      client: row.client.name,
      professional: row.professional.name,
      status: statusLabel(row.status),
    })),
    products,
    professionals: professionals.map((row) => ({
      name: row.name,
      appointmentsToday: counts.get(row.id) ?? 0,
    })),
  };
}
