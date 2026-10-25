import { prisma } from "@/lib/db";
import { comandaTotal } from "@/lib/comandas";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { cancelContoraDocument, emitContoraDocument } from "@/lib/contora";
import {
  amountForKind,
  buildAccessKey,
  fiscalReady,
  isFiscalKind,
  recipientDocument,
  suggestKinds,
  taxCentsForKind,
  tenantFiscalConfig,
  type FiscalConfig,
  type FiscalKind,
  type FiscalLine,
} from "@/lib/fiscal";

export type IssueResult = {
  id: string;
  kind: string;
  status: string;
  number: number | null;
  accessKey: string | null;
  error?: string;
};

async function emitOnProvider(
  config: FiscalConfig,
  payload: {
    kind: FiscalKind;
    number: number;
    amountCents: number;
    description: string;
    lines: FiscalLine[];
    recipient: { name: string; document: string; email?: string | null };
    paymentMethod?: string | null;
    idempotency: string;
  },
) {
  const integrations = await resolvePlatformIntegrations();
  const token = integrations.contoraApiToken || config.providerToken || "";
  const useContora = config.provider === "contora" && Boolean(token);

  if (!useContora) {
    return {
      status: "AUTHORIZED" as const,
      protocol: `LOCAL${payload.number}`,
      accessKey: null as string | null,
      providerRef: payload.idempotency,
      error: null as string | null,
    };
  }

  try {
    const emitted = await emitContoraDocument({
      token,
      kind: payload.kind,
      config,
      number: payload.number,
      amountCents: payload.amountCents,
      description: payload.description,
      lines: payload.lines,
      recipient: payload.recipient,
      paymentMethod: payload.paymentMethod,
      idempotency: payload.idempotency,
    });
    return {
      status: emitted.status,
      protocol: emitted.protocol,
      accessKey: emitted.accessKey,
      providerRef: emitted.id,
      error: emitted.error,
    };
  } catch (error) {
    return {
      status: "REJECTED" as const,
      protocol: null,
      accessKey: null,
      providerRef: null,
      error: error instanceof Error ? error.message : "Falha ao emitir na Contora.",
    };
  }
}

export async function issueComandaInvoices(tenantId: string, comandaId: string, kinds?: FiscalKind[]) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { error: "Salão não encontrado." };
  const config = tenantFiscalConfig(tenant);
  if (!fiscalReady(config)) {
    return { error: "Configure o CNPJ do salão em Configurações → Fiscal antes de emitir." };
  }

  const comanda = await prisma.comanda.findFirst({
    where: { id: comandaId, tenantId },
    include: {
      client: true,
      items: { include: { service: true, product: true } },
    },
  });
  if (!comanda) return { error: "Comanda não encontrada." };
  if (comanda.status !== "CLOSED") return { error: "Feche a comanda antes de emitir a nota." };

  const existing = await prisma.fiscalInvoice.findMany({
    where: { tenantId, comandaId: comanda.id, status: { in: ["AUTHORIZED", "PROCESSING"] } },
  });

  const lines: FiscalLine[] = comanda.items.map((item) => ({
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    priceCents: item.priceCents,
    discountCents: item.discountCents,
    fiscalCode: item.service?.fiscalCode,
    issPct: item.service?.issPct,
    ncm: item.product?.ncm,
    cfop: item.product?.cfop,
  }));

  const wanted = (kinds?.length ? kinds : suggestKinds(lines)).filter(isFiscalKind);
  const pending = wanted.filter((kind) => !existing.some((invoice) => invoice.kind === kind));
  if (!pending.length) return { error: "Esta comanda já tem nota autorizada para os tipos necessários." };

  const recipient = recipientDocument(comanda.client);
  const total = comandaTotal({
    items: comanda.items,
    discountCents: comanda.discountCents,
    creditCents: comanda.creditCents,
    cashbackCents: comanda.cashbackCents,
  });
  const results: IssueResult[] = [];
  let nextNumber = config.nextNumber;

  for (const kind of pending) {
    const amountCents = amountForKind(kind, lines) || (pending.length === 1 ? total : 0);
    if (amountCents <= 0) continue;
    const issuedAt = new Date();
    const number = nextNumber;
    nextNumber += 1;
    const fallbackKey = buildAccessKey({
      uf: config.uf,
      issuedAt,
      cnpj: config.cnpj,
      kind,
      series: config.series,
      number,
    });
    const taxCents = taxCentsForKind(kind, amountCents, config.issPct);
    const idempotency = `mb-${tenant.slug}-${kind}-${comanda.number}`;
    const created = await prisma.fiscalInvoice.create({
      data: {
        tenantId,
        comandaId: comanda.id,
        clientId: comanda.clientId,
        kind,
        status: "PROCESSING",
        number,
        series: config.series,
        accessKey: fallbackKey,
        environment: config.environment,
        provider: config.provider,
        providerRef: idempotency,
        amountCents,
        taxCents,
        notes: `Comanda #${comanda.number}`,
      },
    });

    const emitted = await emitOnProvider(config, {
      kind,
      number,
      amountCents,
      description: comanda.items.map((item) => item.description).join(", ").slice(0, 180),
      lines,
      recipient: { name: comanda.client.name, document: recipient.value, email: comanda.client.email },
      paymentMethod: comanda.paymentMethod,
      idempotency,
    });

    const updated = await prisma.fiscalInvoice.update({
      where: { id: created.id },
      data: {
        status: emitted.status,
        protocol: emitted.protocol,
        accessKey: emitted.accessKey || fallbackKey,
        providerRef: emitted.providerRef ?? created.providerRef,
        issuedAt: emitted.status === "AUTHORIZED" ? issuedAt : null,
        errorMessage: emitted.error,
      },
    });
    results.push({
      id: updated.id,
      kind: updated.kind,
      status: updated.status,
      number: updated.number,
      accessKey: updated.accessKey,
      error: updated.errorMessage ?? undefined,
    });
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { fiscalNextNumber: nextNumber },
  });

  if (!results.length) return { error: "Não havia itens para o tipo de nota selecionado." };
  return { ok: true as const, invoices: results };
}

export async function cancelFiscalInvoice(tenantId: string, invoiceId: string) {
  const invoice = await prisma.fiscalInvoice.findFirst({ where: { id: invoiceId, tenantId } });
  if (!invoice) return { error: "Nota não encontrada." };
  if (invoice.status === "CANCELLED") return { error: "Esta nota já foi cancelada." };
  if (invoice.status !== "AUTHORIZED" && invoice.status !== "REJECTED") {
    return { error: "Só é possível cancelar nota autorizada ou rejeitada." };
  }

  if (invoice.provider === "contora" && invoice.providerRef) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const integrations = await resolvePlatformIntegrations();
    const token = integrations.contoraApiToken || tenant?.fiscalProviderToken || "";
    if (token && tenant) {
      try {
        await cancelContoraDocument(token, invoice.kind, invoice.providerRef, tenantFiscalConfig(tenant).cnpj);
      } catch (error) {
        return { error: error instanceof Error ? error.message : "A Contora não cancelou a nota." };
      }
    }
  }

  await prisma.fiscalInvoice.update({
    where: { id: invoice.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return { ok: true as const };
}
