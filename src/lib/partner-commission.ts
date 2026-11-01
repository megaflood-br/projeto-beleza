import { prisma } from "@/lib/db";
import {
  commissionCents,
  DEFAULT_HOLD_DAYS,
  firstTouchPartnerId,
  releaseAt,
  type CommissionType,
} from "@/lib/partners";

export function nextCommissionStatusAfterRefund(current: string) {
  if (current === "PAID") return "PAID";
  return "CANCELED";
}

export function shouldCreateReversal(current: string) {
  return current === "PAID";
}

export async function recordPaidInvoice(input: {
  tenantId: string;
  asaasPaymentId: string;
  asaasEventId?: string | null;
  amountCents: number;
  paidAt?: Date;
  rawPayload?: unknown;
}) {
  const existing = await prisma.platformInvoice.findUnique({
    where: { asaasPaymentId: input.asaasPaymentId },
    include: { commissions: true },
  });
  if (existing) {
    if (existing.status === "PAID") return existing;
    return prisma.platformInvoice.update({
      where: { id: existing.id },
      data: { status: "PAID", paidAt: input.paidAt ?? new Date() },
    });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true, partnerId: true, billingStatus: true },
  });
  if (!tenant) throw new Error("Tenant não encontrado.");

  const invoice = await prisma.platformInvoice.create({
    data: {
      tenantId: tenant.id,
      partnerId: tenant.partnerId,
      asaasPaymentId: input.asaasPaymentId,
      asaasEventId: input.asaasEventId ?? undefined,
      amountCents: input.amountCents,
      status: "PAID",
      paidAt: input.paidAt ?? new Date(),
      rawPayload: JSON.stringify(input.rawPayload ?? {}),
    },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { billingStatus: "ACTIVE" },
  });

  if (tenant.partnerId) {
    const partner = await prisma.partner.findUnique({ where: { id: tenant.partnerId } });
    if (partner && partner.status === "ACTIVE") {
      const paidAt = invoice.paidAt ?? new Date();
      await prisma.partnerCommission.create({
        data: {
          partnerId: partner.id,
          tenantId: tenant.id,
          invoiceId: invoice.id,
          type: "SALE",
          saleCents: input.amountCents,
          commissionBps: partner.commissionBps,
          commissionCents: commissionCents(input.amountCents, partner.commissionBps),
          status: "PENDING",
          availableAt: releaseAt(paidAt, partner.holdDays ?? DEFAULT_HOLD_DAYS),
        },
      });
    }
  }

  return invoice;
}

export async function cancelPaidInvoice(asaasPaymentId: string) {
  const invoice = await prisma.platformInvoice.findUnique({
    where: { asaasPaymentId },
    include: { commissions: true },
  });
  if (!invoice) return null;

  await prisma.platformInvoice.update({
    where: { id: invoice.id },
    data: { status: "REFUNDED" },
  });

  for (const line of invoice.commissions) {
    if (line.status === "CANCELED") continue;
    if (shouldCreateReversal(line.status)) {
      await prisma.partnerCommission.create({
        data: {
          partnerId: line.partnerId,
          tenantId: line.tenantId,
          invoiceId: invoice.id,
          type: "REVERSAL",
          saleCents: -line.saleCents,
          commissionBps: line.commissionBps,
          commissionCents: -line.commissionCents,
          status: "AVAILABLE",
          note: `Estorno da comissão ${line.id}`,
        },
      });
    } else {
      await prisma.partnerCommission.update({
        where: { id: line.id },
        data: { status: nextCommissionStatusAfterRefund(line.status) },
      });
    }
  }
  return invoice;
}

export async function promoteDueCommissions(now = new Date()) {
  const result = await prisma.partnerCommission.updateMany({
    where: {
      status: "PENDING",
      type: "SALE",
      availableAt: { lte: now },
    },
    data: { status: "AVAILABLE" },
  });
  return result.count;
}

export async function createManualCommission(input: {
  partnerId: string;
  tenantId?: string | null;
  type: Extract<CommissionType, "BONUS" | "ADJUST">;
  amountCents: number;
  note?: string;
}) {
  const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
  if (!partner) throw new Error("Parceiro não encontrado.");
  const tenantId = input.tenantId || partner.tenantId;
  return prisma.partnerCommission.create({
    data: {
      partnerId: partner.id,
      tenantId,
      type: input.type,
      saleCents: 0,
      commissionBps: 0,
      commissionCents: input.amountCents,
      status: "AVAILABLE",
      availableAt: new Date(),
      note: input.note,
    },
  });
}

export { firstTouchPartnerId };
