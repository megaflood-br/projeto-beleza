"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { calculateCommission } from "@/lib/commissions";
import { nextStock } from "@/lib/stock";
import { comandaTotal } from "@/lib/comandas";
import { parseBRLToCents } from "@/lib/money";

async function nextNumber(tenantId: string) {
  const last = await prisma.comanda.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

function revalidateComandas() {
  revalidatePath("/comandas");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  revalidatePath("/comissoes");
  revalidatePath("/estoque");
}

export async function createComandaFromAppointment(appointmentId: string) {
  const { session } = await requireTenant();
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: session.tenantId },
    include: { items: { include: { service: true } }, comanda: true },
  });
  if (!appointment) return { error: "Agendamento não encontrado." };
  if (appointment.comanda) return { ok: true as const, id: appointment.comanda.id, existing: true };

  const comanda = await prisma.comanda.create({
    data: {
      tenantId: session.tenantId,
      number: await nextNumber(session.tenantId),
      clientId: appointment.clientId,
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      status: "OPEN",
      items: {
        create: appointment.items.map((item) => ({
          type: "SERVICE",
          serviceId: item.serviceId,
          professionalId: item.professionalId ?? appointment.professionalId,
          description: item.service.name,
          quantity: 1,
          priceCents: item.priceCents,
          durationMin: item.durationMin,
        })),
      },
    },
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: appointment.status === "PENDING" ? "CONFIRMED" : appointment.status },
  });

  revalidateComandas();
  return { ok: true as const, id: comanda.id, existing: false };
}

export async function createWalkInComanda(formData: FormData) {
  const { session } = await requireTenant();
  const clientId = String(formData.get("clientId") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  if (!clientId) return { error: "Selecione um cliente." };

  const comanda = await prisma.comanda.create({
    data: {
      tenantId: session.tenantId,
      number: await nextNumber(session.tenantId),
      clientId,
      professionalId,
      status: "OPEN",
    },
  });
  revalidateComandas();
  redirect(`/comandas/${comanda.id}`);
}

export async function addComandaItem(formData: FormData) {
  const { session } = await requireTenant();
  const comandaId = String(formData.get("comandaId") ?? "");
  const type = String(formData.get("type") ?? "SERVICE");
  const serviceId = String(formData.get("serviceId") ?? "") || null;
  const productId = String(formData.get("productId") ?? "") || null;
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const quantity = Number(formData.get("quantity") ?? 1) || 1;

  const comanda = await prisma.comanda.findFirst({
    where: { id: comandaId, tenantId: session.tenantId, status: "OPEN" },
  });
  if (!comanda) return { error: "Comanda não encontrada ou já fechada." };

  if (type === "SERVICE") {
    const service = await prisma.service.findFirst({
      where: { id: serviceId ?? "", tenantId: session.tenantId },
    });
    if (!service) return { error: "Selecione um serviço." };
    await prisma.comandaItem.create({
      data: {
        comandaId,
        type: "SERVICE",
        serviceId: service.id,
        professionalId: professionalId ?? comanda.professionalId,
        description: service.name,
        quantity,
        priceCents: service.priceCents,
        durationMin: service.durationMin,
      },
    });
  } else {
    const product = await prisma.product.findFirst({
      where: { id: productId ?? "", tenantId: session.tenantId },
    });
    if (!product) return { error: "Selecione um produto." };
    await prisma.comandaItem.create({
      data: {
        comandaId,
        type: "PRODUCT",
        productId: product.id,
        description: product.name,
        quantity,
        priceCents: product.saleCents,
      },
    });
  }

  revalidatePath(`/comandas/${comandaId}`);
  revalidatePath("/comandas");
  return { ok: true };
}

export async function removeComandaItem(itemId: string) {
  const { session } = await requireTenant();
  const item = await prisma.comandaItem.findFirst({
    where: { id: itemId, comanda: { tenantId: session.tenantId, status: "OPEN" } },
  });
  if (!item) return { error: "Item não encontrado." };
  await prisma.comandaItem.delete({ where: { id: item.id } });
  revalidatePath(`/comandas/${item.comandaId}`);
  revalidatePath("/comandas");
  return { ok: true };
}

export async function removeComandaItemForm(formData: FormData) {
  return removeComandaItem(String(formData.get("itemId") ?? ""));
}

export async function closeComanda(formData: FormData) {
  const { session } = await requireTenant();
  const comandaId = String(formData.get("comandaId") ?? "");
  const method = String(formData.get("method") ?? "PIX");
  const discountCents = parseBRLToCents(String(formData.get("discount") ?? "0"));

  const comanda = await prisma.comanda.findFirst({
    where: { id: comandaId, tenantId: session.tenantId },
    include: {
      items: { include: { service: { include: { products: true } } } },
      appointment: { include: { commissions: true } },
    },
  });
  if (!comanda) return { error: "Comanda não encontrada." };
  if (comanda.status !== "OPEN") return { error: "Esta comanda já foi encerrada." };
  if (comanda.items.length === 0) return { error: "Inclua itens antes de fechar." };

  const total = comandaTotal({ items: comanda.items, discountCents });

  await prisma.comanda.update({
    where: { id: comanda.id },
    data: { status: "CLOSED", closedAt: new Date(), paymentMethod: method, discountCents },
  });

  await prisma.transaction.create({
    data: {
      tenantId: session.tenantId,
      type: "INCOME",
      category: "comanda",
      amountCents: total,
      method,
      description: `Comanda #${comanda.number}`,
      appointmentId: comanda.appointmentId,
      comandaId: comanda.id,
    },
  });

  for (const item of comanda.items.filter((i) => i.type === "SERVICE")) {
    const professionalId = item.professionalId ?? comanda.professionalId;
    if (!professionalId) continue;
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: session.tenantId },
    });
    if (!professional) continue;
    const { percent, amountCents } = calculateCommission({
      priceCents: Math.round(item.priceCents * item.quantity),
      professionalPct: professional.commissionPct,
      servicePct: item.service?.commissionPct,
    });
    await prisma.commission.create({
      data: {
        tenantId: session.tenantId,
        professionalId,
        appointmentId: comanda.appointmentId,
        comandaId: comanda.id,
        amountCents,
        percent,
      },
    });
  }

  for (const item of comanda.items) {
    if (item.type === "PRODUCT" && item.productId) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, tenantId: session.tenantId },
      });
      if (!product) continue;
      const stock = nextStock(product.stock, "OUT", item.quantity);
      await prisma.product.update({ where: { id: product.id }, data: { stock } });
      await prisma.stockMovement.create({
        data: {
          tenantId: session.tenantId,
          productId: product.id,
          type: "OUT",
          quantity: item.quantity,
          reason: `Comanda #${comanda.number}`,
          comandaId: comanda.id,
          appointmentId: comanda.appointmentId,
        },
      });
    }
    if (item.type === "SERVICE" && item.service) {
      for (const usage of item.service.products) {
        const product = await prisma.product.findFirst({
          where: { id: usage.productId, tenantId: session.tenantId },
        });
        if (!product) continue;
        const qty = usage.quantity * item.quantity;
        const stock = nextStock(product.stock, "OUT", qty);
        await prisma.product.update({ where: { id: product.id }, data: { stock } });
        await prisma.stockMovement.create({
          data: {
            tenantId: session.tenantId,
            productId: product.id,
            type: "OUT",
            quantity: qty,
            reason: `Uso em ${item.description}`,
            comandaId: comanda.id,
            appointmentId: comanda.appointmentId,
          },
        });
      }
    }
  }

  if (comanda.appointmentId) {
    await prisma.appointment.update({
      where: { id: comanda.appointmentId },
      data: { status: "COMPLETED" },
    });
  }

  revalidateComandas();
  revalidatePath(`/comandas/${comanda.id}`);
  return { ok: true };
}
