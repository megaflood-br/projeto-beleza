import { prisma } from "@/lib/db";

export type AsaasConfig = {
  apiKey: string;
  webhookToken: string;
  baseUrl: string;
};

export async function resolveAsaasConfig(): Promise<AsaasConfig> {
  const hq = await prisma.tenant.findFirst({
    where: { isPlatform: true },
    select: { asaasApiKey: true, asaasWebhookToken: true, asaasBaseUrl: true },
  });
  return {
    apiKey: hq?.asaasApiKey || process.env.ASAAS_API_KEY || "",
    webhookToken: hq?.asaasWebhookToken || process.env.ASAAS_WEBHOOK_TOKEN || "",
    baseUrl: (hq?.asaasBaseUrl || process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3").replace(/\/$/, ""),
  };
}

export function asaasEventName(payload: Record<string, unknown>) {
  return String(payload.event ?? payload.type ?? "").toUpperCase();
}

export function asaasPaymentFromPayload(payload: Record<string, unknown>) {
  const payment = (payload.payment ?? payload) as Record<string, unknown>;
  const id = String(payment.id ?? payload.paymentId ?? "");
  const customer = String(payment.customer ?? "");
  const subscription = String(payment.subscription ?? "");
  const externalReference = String(payment.externalReference ?? "");
  const value = Number(payment.value ?? payment.netValue ?? 0);
  const amountCents = Number.isFinite(value) ? Math.round(value * 100) : 0;
  const confirmedDate = String(payment.clientPaymentDate ?? payment.confirmedDate ?? payment.paymentDate ?? "");
  return {
    id,
    customer,
    subscription,
    externalReference,
    amountCents,
    paidAt: confirmedDate ? new Date(confirmedDate) : new Date(),
  };
}

export function isAsaasPaidEvent(event: string) {
  return event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED_IN_CASH";
}

export function isAsaasRefundEvent(event: string) {
  return event === "PAYMENT_REFUNDED" || event === "PAYMENT_DELETED" || event === "PAYMENT_CHARGEBACK_REQUESTED";
}

export function isAsaasOverdueEvent(event: string) {
  return event === "PAYMENT_OVERDUE";
}

export function verifyAsaasToken(received: string | null | undefined, expected: string) {
  if (!expected) return false;
  return String(received ?? "").trim() === expected;
}

export async function findTenantForAsaasPayment(payment: {
  customer: string;
  subscription: string;
  externalReference: string;
}) {
  if (payment.externalReference) {
    const byId = await prisma.tenant.findUnique({ where: { id: payment.externalReference } });
    if (byId) return byId;
  }
  if (payment.subscription) {
    const bySub = await prisma.tenant.findFirst({ where: { asaasSubscriptionId: payment.subscription } });
    if (bySub) return bySub;
  }
  if (payment.customer) {
    return prisma.tenant.findFirst({ where: { asaasCustomerId: payment.customer } });
  }
  return null;
}
