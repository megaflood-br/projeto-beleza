"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { calculateCommission } from "@/lib/commissions";
import { nextStock } from "@/lib/stock";
import { allocatePayments, comandaTotal } from "@/lib/comandas";
import { parseBRLToCents } from "@/lib/money";
import { zonedDateTime } from "@/lib/dates";
import { PAYMENT_METHODS } from "@/lib/constants";

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

export async function upsertComanda(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const discountCents = parseBRLToCents(String(formData.get("discount") ?? "0"));
  const creditCents = parseBRLToCents(String(formData.get("credit") ?? "0"));
  const cashbackCents = parseBRLToCents(String(formData.get("cashback") ?? "0"));
  const dateRaw = String(formData.get("occurredAt") ?? "");
  const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? zonedDateTime(dateRaw, "12:00") : new Date();
  const numberRaw = Number(formData.get("number") ?? "");

  if (!clientId) return { error: "Selecione um cliente." };

  const keys = formData.getAll("itemKey").map(String);
  const qtys = formData.getAll("itemQty").map(String);
  const prices = formData.getAll("itemPrice").map(String);
  const discounts = formData.getAll("itemDiscount").map(String);
  const discountTypes = formData.getAll("itemDiscountType").map(String);
  const itemProfessionals = formData.getAll("itemProfessionalId").map(String);

  const parsedItems: {
    type: string;
    serviceId: string | null;
    productId: string | null;
    professionalId: string | null;
    description: string;
    quantity: number;
    priceCents: number;
    discountCents: number;
    durationMin: number;
  }[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key) continue;
    const [kind, entityId] = key.split(":");
    const quantity = Number(String(qtys[i] ?? "1").replace(",", ".")) || 1;
    const priceCents = parseBRLToCents(prices[i] ?? "0");
    const discountInput = discounts[i] ?? "0";
    const discountType = discountTypes[i] === "percent" ? "percent" : "money";
    const gross = Math.round(quantity * priceCents);
    const discountCentsItem =
      discountType === "percent"
        ? Math.round(gross * ((Number(String(discountInput).replace(",", ".")) || 0) / 100))
        : parseBRLToCents(discountInput);
    if (kind === "SERVICE") {
      const service = await prisma.service.findFirst({ where: { id: entityId, tenantId: session.tenantId } });
      if (!service) continue;
      parsedItems.push({
        type: "SERVICE",
        serviceId: service.id,
        productId: null,
        professionalId: itemProfessionals[i] || professionalId,
        description: service.name,
        quantity,
        priceCents: priceCents || service.priceCents,
        discountCents: Math.min(gross, Math.max(0, discountCentsItem)),
        durationMin: service.durationMin,
      });
    } else if (kind === "PRODUCT") {
      const product = await prisma.product.findFirst({ where: { id: entityId, tenantId: session.tenantId } });
      if (!product) continue;
      parsedItems.push({
        type: "PRODUCT",
        serviceId: null,
        productId: product.id,
        professionalId: itemProfessionals[i] || professionalId,
        description: product.name,
        quantity,
        priceCents: priceCents || product.saleCents,
        discountCents: Math.min(gross, Math.max(0, discountCentsItem)),
        durationMin: 0,
      });
    }
  }

  try {
    let comandaId = id;
    let number = Number.isFinite(numberRaw) && numberRaw > 0 ? Math.round(numberRaw) : await nextNumber(session.tenantId);

    if (id) {
      const existing = await prisma.comanda.findFirst({ where: { id, tenantId: session.tenantId } });
      if (!existing) return { error: "Comanda não encontrada." };
      if (existing.status !== "OPEN") return { error: "Esta comanda já foi encerrada." };
      if (number !== existing.number) {
        const taken = await prisma.comanda.findFirst({ where: { tenantId: session.tenantId, number } });
        if (taken) return { error: "Já existe uma comanda com este número." };
      }
      await prisma.comanda.update({
        where: { id },
        data: {
          clientId,
          professionalId,
          notes,
          discountCents,
          creditCents,
          cashbackCents,
          occurredAt,
          number,
        },
      });
      await prisma.comandaItem.deleteMany({ where: { comandaId: id } });
    } else {
      const taken = await prisma.comanda.findFirst({ where: { tenantId: session.tenantId, number } });
      if (taken) number = await nextNumber(session.tenantId);
      const created = await prisma.comanda.create({
        data: {
          tenantId: session.tenantId,
          number,
          clientId,
          professionalId,
          notes,
          discountCents,
          creditCents,
          cashbackCents,
          occurredAt,
          status: "OPEN",
        },
      });
      comandaId = created.id;
    }

    if (parsedItems.length) {
      await prisma.comandaItem.createMany({
        data: parsedItems.map((item) => ({ comandaId, ...item })),
      });
    }
    revalidateComandas();
    revalidatePath(`/comandas/${comandaId}`);
    return { ok: true, id: comandaId };
  } catch (err) {
    if (
      typeof err === "object" &&
      err &&
      "digest" in err &&
      String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("upsertComanda", err);
    return { error: "Não foi possível salvar a comanda. Confira os campos e tente de novo." };
  }
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

type ParsedPayment = {
  method: string;
  amountCents: number;
  installments: number;
  occurredAt: Date;
};

function parsePayments(formData: FormData): ParsedPayment[] {
  const methods = formData.getAll("payMethod").map(String);
  const amounts = formData.getAll("payAmount").map(String);
  const installments = formData.getAll("payInstallments").map(String);
  const dates = formData.getAll("payDate").map(String);
  const allowed = new Set<string>(PAYMENT_METHODS);
  const payments: ParsedPayment[] = [];
  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    if (!allowed.has(method)) continue;
    const amountCents = parseBRLToCents(amounts[i] ?? "0");
    if (amountCents <= 0) continue;
    const qty = Math.max(1, Math.min(12, Math.round(Number(installments[i] ?? "1") || 1)));
    const dateRaw = dates[i] ?? "";
    const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? zonedDateTime(dateRaw, "12:00") : new Date();
    payments.push({ method, amountCents, installments: qty, occurredAt });
  }
  return payments;
}

async function finalizeOpenComanda(
  tenantId: string,
  comandaId: string,
  payments: ParsedPayment[],
  discountOverride?: number,
) {
  const comanda = await prisma.comanda.findFirst({
    where: { id: comandaId, tenantId },
    include: {
      items: { include: { service: { include: { products: true } } } },
      appointment: { include: { commissions: true } },
    },
  });
  if (!comanda) return { error: "Comanda não encontrada." };
  if (comanda.status !== "OPEN") return { error: "Esta comanda já foi encerrada." };
  if (comanda.items.length === 0) return { error: "Inclua itens antes de fechar." };
  if (!payments.length) return { error: "Adicione um pagamento." };

  const discountCents = discountOverride ?? comanda.discountCents;
  const total = comandaTotal({
    items: comanda.items,
    discountCents,
    creditCents: comanda.creditCents,
    cashbackCents: comanda.cashbackCents,
  });
  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  if (paidCents < total) return { error: "O total pago é menor que o valor da comanda." };

  const allocated = allocatePayments(total, payments);
  const primary = allocated.find((p) => p.appliedCents > 0) ?? allocated[0];

  await prisma.comanda.update({
    where: { id: comanda.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      paymentMethod: primary.method,
      discountCents,
    },
  });

  if (comanda.creditCents > 0 || comanda.cashbackCents > 0) {
    const client = await prisma.client.findFirst({ where: { id: comanda.clientId, tenantId } });
    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          creditCents: Math.max(0, client.creditCents - comanda.creditCents),
          cashbackCents: Math.max(0, client.cashbackCents - comanda.cashbackCents),
        },
      });
    }
  }

  for (const payment of allocated) {
    if (payment.appliedCents <= 0) continue;
    await prisma.transaction.create({
      data: {
        tenantId,
        type: "INCOME",
        category: "comanda",
        amountCents: payment.appliedCents,
        method: payment.method,
        account: "caixa",
        description:
          payment.installments > 1 ? `Comanda #${comanda.number} · ${payment.installments}x` : `Comanda #${comanda.number}`,
        appointmentId: comanda.appointmentId,
        comandaId: comanda.id,
        occurredAt: payment.occurredAt,
      },
    });
  }

  for (const item of comanda.items.filter((i) => i.type === "SERVICE")) {
    const professionalId = item.professionalId ?? comanda.professionalId;
    if (!professionalId) continue;
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId },
    });
    if (!professional) continue;
    const { percent, amountCents } = calculateCommission({
      priceCents: Math.round(item.priceCents * item.quantity),
      professionalPct: professional.commissionPct,
      servicePct: item.service?.commissionPct,
    });
    await prisma.commission.create({
      data: {
        tenantId,
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
        where: { id: item.productId, tenantId },
      });
      if (!product) continue;
      const stock = nextStock(product.stock, "OUT", item.quantity);
      await prisma.product.update({ where: { id: product.id }, data: { stock } });
      await prisma.stockMovement.create({
        data: {
          tenantId,
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
          where: { id: usage.productId, tenantId },
        });
        if (!product) continue;
        const qty = usage.quantity * item.quantity;
        const stock = nextStock(product.stock, "OUT", qty);
        await prisma.product.update({ where: { id: product.id }, data: { stock } });
        await prisma.stockMovement.create({
          data: {
            tenantId,
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
  return { ok: true as const, id: comanda.id };
}

export async function invoiceComanda(formData: FormData) {
  const saved = await upsertComanda(formData);
  if (saved && "error" in saved && saved.error) return saved;
  if (!saved || !("id" in saved) || !saved.id) return { error: "Não foi possível salvar a comanda." };
  const { session } = await requireTenant();
  return finalizeOpenComanda(session.tenantId, saved.id, parsePayments(formData));
}

export async function closeComanda(formData: FormData) {
  const { session } = await requireTenant();
  const comandaId = String(formData.get("comandaId") ?? "");
  const method = String(formData.get("method") ?? "PIX");
  const discountCents = parseBRLToCents(String(formData.get("discount") ?? "0"));
  const allowed = new Set<string>(PAYMENT_METHODS);
  if (!allowed.has(method)) return { error: "Forma de pagamento inválida." };

  const comanda = await prisma.comanda.findFirst({
    where: { id: comandaId, tenantId: session.tenantId },
    include: { items: true },
  });
  if (!comanda) return { error: "Comanda não encontrada." };
  const total = comandaTotal({
    items: comanda.items,
    discountCents,
    creditCents: comanda.creditCents,
    cashbackCents: comanda.cashbackCents,
  });

  return finalizeOpenComanda(
    session.tenantId,
    comandaId,
    [{ method, amountCents: total, installments: 1, occurredAt: new Date() }],
    discountCents,
  );
}
