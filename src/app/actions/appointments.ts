"use server";

import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { hasConflict } from "@/lib/appointments";
import { calculateCommission } from "@/lib/commissions";
import { nextStock } from "@/lib/stock";
import { atTime, calendarDate, formatTime } from "@/lib/dates";

export type AppointmentItemInput = {
  serviceId: string;
  professionalId: string;
  time: string;
  durationMin: number;
};

async function loadBusy(professionalId: string, excludeId?: string) {
  return prisma.appointment.findMany({
    where: {
      professionalId,
      status: { notIn: ["CANCELLED"] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, startAt: true, endAt: true },
  });
}

function itemWindow(date: string, item: AppointmentItemInput) {
  const start = atTime(date, item.time);
  return { start, end: addMinutes(start, item.durationMin || 15) };
}

export async function createAppointment(formData: FormData) {
  const professionalId = String(formData.get("professionalId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const notes = String(formData.get("notes") ?? "") || undefined;
  const time = formatTime(startAt);
  const date = calendarDate(startAt);

  return saveAppointment({
    clientId,
    date,
    status: "PENDING",
    notes,
    items: [{ serviceId, professionalId, time, durationMin: 0 }],
  });
}

export async function saveAppointment(payload: {
  id?: string;
  clientId: string;
  date: string;
  status: string;
  notes?: string;
  items: AppointmentItemInput[];
}) {
  const { session } = await requireTenant();
  const items = payload.items.filter((item) => item.serviceId && item.professionalId && item.time);
  if (!payload.clientId) return { error: "Selecione um cliente." };
  if (items.length === 0) return { error: "Inclua pelo menos um serviço." };

  const services = await prisma.service.findMany({
    where: { tenantId: session.tenantId, id: { in: items.map((i) => i.serviceId) } },
  });
  const byId = new Map(services.map((s) => [s.id, s]));

  const resolved = items.map((item) => {
    const service = byId.get(item.serviceId);
    const durationMin = item.durationMin || service?.durationMin || 30;
    const { start, end } = itemWindow(payload.date, { ...item, durationMin });
    return { ...item, durationMin, start, end, service };
  });

  if (resolved.some((item) => !item.service)) return { error: "Serviço inválido." };

  for (const item of resolved) {
    const busy = await loadBusy(item.professionalId, payload.id);
    if (hasConflict({ id: payload.id, start: item.start, end: item.end }, busy.map((b) => ({ id: b.id, start: b.startAt, end: b.endAt })))) {
      return { error: "Este horário conflita com outro agendamento do profissional." };
    }
  }

  const startAt = resolved.reduce((min, item) => (item.start < min ? item.start : min), resolved[0].start);
  const endAt = resolved.reduce((max, item) => (item.end > max ? item.end : max), resolved[0].end);
  const professionalId = resolved[0].professionalId;

  const data = {
    tenantId: session.tenantId,
    professionalId,
    clientId: payload.clientId,
    startAt,
    endAt,
    status: payload.status || "PENDING",
    notes: payload.notes || null,
    source: "balcao",
  };

  let id = payload.id;
  if (id) {
    const existing = await prisma.appointment.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Agendamento não encontrado." };
    await prisma.appointment.update({ where: { id }, data });
    await prisma.appointmentItem.deleteMany({ where: { appointmentId: id } });
  } else {
    const created = await prisma.appointment.create({ data });
    id = created.id;
  }

  await prisma.appointmentItem.createMany({
    data: resolved.map((item) => ({
      appointmentId: id!,
      serviceId: item.serviceId,
      professionalId: item.professionalId,
      startAt: item.start,
      durationMin: item.durationMin,
      priceCents: item.service!.priceCents,
    })),
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true as const, id };
}

export async function deleteAppointment(appointmentId: string) {
  const { session } = await requireTenant();
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: session.tenantId },
    include: { comanda: true },
  });
  if (!appointment) return { error: "Agendamento não encontrado." };
  if (appointment.comanda?.status === "CLOSED") {
    return { error: "Não é possível excluir: a comanda já foi fechada." };
  }
  if (appointment.comanda) {
    await prisma.comanda.delete({ where: { id: appointment.comanda.id } });
  }
  await prisma.appointment.delete({ where: { id: appointment.id } });
  revalidatePath("/agenda");
  revalidatePath("/comandas");
  return { ok: true };
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const { session } = await requireTenant();
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: session.tenantId },
    include: {
      items: { include: { service: { include: { products: true } } } },
      professional: true,
      commissions: true,
      comanda: true,
    },
  });
  if (!appointment) return { error: "Agendamento não encontrado." };

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status },
  });

  if (status === "COMPLETED" && appointment.commissions.length === 0 && appointment.comanda?.status !== "CLOSED") {
    const priceCents = appointment.items.reduce((sum, item) => sum + item.priceCents, 0);
    const { percent, amountCents } = calculateCommission({
      priceCents,
      professionalPct: appointment.professional.commissionPct,
      servicePct: appointment.items[0]?.service.commissionPct,
    });

    await prisma.commission.create({
      data: {
        tenantId: session.tenantId,
        professionalId: appointment.professionalId,
        appointmentId: appointment.id,
        amountCents,
        percent,
      },
    });

    await prisma.transaction.create({
      data: {
        tenantId: session.tenantId,
        type: "INCOME",
        category: "servico",
        amountCents: priceCents,
        method: "PIX",
        description: appointment.items.map((item) => item.service.name).join(", "),
        appointmentId: appointment.id,
      },
    });

    for (const item of appointment.items) {
      for (const usage of item.service.products) {
        const product = await prisma.product.findFirst({
          where: { id: usage.productId, tenantId: session.tenantId },
        });
        if (!product) continue;
        const stock = nextStock(product.stock, "OUT", usage.quantity);
        await prisma.product.update({ where: { id: product.id }, data: { stock } });
        await prisma.stockMovement.create({
          data: {
            tenantId: session.tenantId,
            productId: product.id,
            type: "OUT",
            quantity: usage.quantity,
            reason: `Uso em ${item.service.name}`,
            appointmentId: appointment.id,
          },
        });
      }
    }
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/comissoes");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  return { ok: true };
}
