import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  asaasEventName,
  asaasPaymentFromPayload,
  findTenantForAsaasPayment,
  isAsaasOverdueEvent,
  isAsaasPaidEvent,
  isAsaasRefundEvent,
  resolveAsaasConfig,
  verifyAsaasToken,
} from "@/lib/asaas";
import { cancelPaidInvoice, promoteDueCommissions, recordPaidInvoice } from "@/lib/partner-commission";

export async function POST(request: NextRequest) {
  const config = await resolveAsaasConfig();
  const token =
    request.headers.get("asaas-access-token") ||
    request.headers.get("asaas-access-token".toUpperCase()) ||
    request.nextUrl.searchParams.get("token");
  if (!verifyAsaasToken(token, config.webhookToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const event = asaasEventName(payload);
  const payment = asaasPaymentFromPayload(payload);
  await promoteDueCommissions().catch(() => 0);

  if (isAsaasRefundEvent(event) && payment.id) {
    await cancelPaidInvoice(payment.id);
    return NextResponse.json({ ok: true, event });
  }

  if (isAsaasOverdueEvent(event)) {
    const tenant = await findTenantForAsaasPayment(payment);
    if (tenant) {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { billingStatus: "PAST_DUE" } });
    }
    return NextResponse.json({ ok: true, event });
  }

  if (!isAsaasPaidEvent(event) || !payment.id || payment.amountCents <= 0) {
    return NextResponse.json({ ok: true, ignored: true, event });
  }

  const tenant = await findTenantForAsaasPayment(payment);
  if (!tenant) return NextResponse.json({ ok: true, ignored: "tenant" });

  await recordPaidInvoice({
    tenantId: tenant.id,
    asaasPaymentId: payment.id,
    asaasEventId: String(payload.id ?? event),
    amountCents: payment.amountCents,
    paidAt: payment.paidAt,
    rawPayload: payload,
  });

  return NextResponse.json({ ok: true, event });
}
