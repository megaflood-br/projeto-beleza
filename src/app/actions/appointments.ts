"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { hasConflict } from "@/lib/appointments";
import { calculateCommission } from "@/lib/commissions";
import { nextStock } from "@/lib/stock";
import { addMinutes } from "date-fns";

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

export async function createAppointment(formData: FormData) {
  const { session } = await requireTenant();
  const professionalId = String(formData.get("professionalId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const notes = String(formData.get("notes") ?? "") || null;
  const source = String(formData.get("source") ?? "balcao");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: session.tenantId },
  });
  if (!service) return { error: "Serviço não encontrado." };

  const endAt = addMinutes(startAt, service.durationMin);
  const busy = await loadBusy(professionalId);
  if (hasConflict({ start: startAt, end: endAt }, busy.map((b) => ({ id: b.id, start: b.startAt, end: b.endAt })))) {
    return { error: "Este horário conflita com outro agendamento do profissional." };
  }

  await prisma.appointment.create({
    data: {
      tenantId: session.tenantId,
      professionalId,
      clientId,
      startAt,
      endAt,
      status: "PENDING",
      notes,
      source,
      items: {
        create: {
          serviceId: service.id,
          priceCents: service.priceCents,
          durationMin: service.durationMin,
        },
      },
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
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
    },
  });
  if (!appointment) return { error: "Agendamento não encontrado." };

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status },
  });

  if (status === "COMPLETED" && appointment.commissions.length === 0) {
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

export async function rescheduleAppointment(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const professionalId = String(formData.get("professionalId") ?? "");

  const appointment = await prisma.appointment.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { items: true },
  });
  if (!appointment) return { error: "Agendamento não encontrado." };

  const duration = appointment.items.reduce((sum, item) => sum + item.durationMin, 0);
  const endAt = addMinutes(startAt, duration || 30);
  const busy = await loadBusy(professionalId, appointment.id);
  if (hasConflict({ id, start: startAt, end: endAt }, busy.map((b) => ({ id: b.id, start: b.startAt, end: b.endAt })))) {
    return { error: "Conflito de horário." };
  }

  await prisma.appointment.update({
    where: { id },
    data: { startAt, endAt, professionalId },
  });
  revalidatePath("/agenda");
  return { ok: true };
}
