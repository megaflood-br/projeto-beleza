"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { chatWithSalonContext, fallbackInsight } from "@/lib/openai";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { occupancyPercent } from "@/lib/appointments";
import { formatTime, rangeOfCalendarDate, shiftCalendarDate, calendarDate } from "@/lib/dates";
import {
  answerAssistantIntent,
  assistantDayLabel,
  assistantDayOffset,
  assistantIntent,
  formatAssistantContext,
  freeSlotsForProfessional,
  lowStockProducts,
  professionalLabels,
  type AssistantSnapshot,
} from "@/lib/assistant";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";

function statusLabel(status: string) {
  return STATUS_LABEL[status as AppointmentStatus] ?? status;
}

export async function askAssistant(question: string) {
  const { session, tenant } = await requireTenant();
  const offset = assistantDayOffset(question);
  const snapshot = await loadAssistantSnapshot(session.tenantId, tenant, offset);
  const intent = assistantIntent(question, professionalLabels(snapshot.professionals));
  const fact = answerAssistantIntent(intent, snapshot, question);

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

async function loadAssistantSnapshot(
  tenantId: string,
  tenant: { name: string; openTime: string; closeTime: string; slotMinutes: number },
  dayOffset = 0,
): Promise<AssistantSnapshot> {
  const day = shiftCalendarDate(calendarDate(), dayOffset);
  const { start, end } = rangeOfCalendarDate(day);
  const nowHHmm = dayOffset === 0 ? formatTime(new Date()) : undefined;
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
      select: { id: true, name: true, nickname: true, workStart: true, workEnd: true },
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
    salon: tenant.name,
    dayLabel: assistantDayLabel(dayOffset),
    revenueCents: income._sum.amountCents ?? 0,
    occupancy,
    noShows: appointments.filter((row) => row.status === "NO_SHOW").length,
    appointments: appointments.map((row) => ({
      time: formatTime(row.startAt),
      end: formatTime(row.endAt),
      client: row.client.name,
      professional: row.professional.name,
      status: statusLabel(row.status),
    })),
    products,
    professionals: professionals.map((row) => ({
      name: row.name,
      nickname: row.nickname,
      appointmentsToday: counts.get(row.id) ?? 0,
      workStart: row.workStart || tenant.openTime,
      workEnd: row.workEnd || tenant.closeTime,
      freeSlots: freeSlotsForProfessional({
        openTime: row.workStart || tenant.openTime,
        closeTime: row.workEnd || tenant.closeTime,
        slotMinutes: tenant.slotMinutes,
        nowHHmm,
        busy: appointments
          .filter((item) => item.professionalId === row.id && item.status !== "CANCELLED")
          .map((item) => ({ start: formatTime(item.startAt), end: formatTime(item.endAt) })),
      }),
    })),
  };
}
