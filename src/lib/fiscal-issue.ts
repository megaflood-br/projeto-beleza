import { prisma } from "@/lib/db";
import { comandaTotal } from "@/lib/comandas";
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

function providerUrl(config: FiscalConfig) {
  if (config.providerUrl) return config.providerUrl.replace(/\/$/, "");
  return config.environment === "prod" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
}

async function emitOnProvider(
  config: FiscalConfig,
  payload: {
    ref: string;
    kind: FiscalKind;
    number: number;
    series: string;
    amountCents: number;
    taxCents: number;
    accessKey: string;
    description: string;
    recipient: { name: string; document: string };
  },
) {
  if (config.provider !== "focusnfe" || !config.providerToken) {
    return { status: "AUTHORIZED" as const, protocol: `LOCAL${payload.number}`, error: null as string | null };
  }

  const path = payload.kind === "NFSE" ? "/v2/nfse" : payload.kind === "NFCE" ? "/v2/nfce" : "/v2/nfe";
  const token = Buffer.from(`${config.providerToken}:`).toString("base64");
  try {
    const response = await fetch(`${providerUrl(config)}${path}?ref=${encodeURIComponent(payload.ref)}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data_emissao: new Date().toISOString(),
        prestador: {
          cnpj: config.cnpj,
          inscricao_municipal: config.im,
          codigo_municipio: config.ibge,
        },
        tomador: {
          razao_social: payload.recipient.name,
          cpf: payload.recipient.document.length === 11 ? payload.recipient.document : undefined,
          cnpj: payload.recipient.document.length === 14 ? payload.recipient.document : undefined,
        },
        servico:
          payload.kind === "NFSE"
            ? {
                descricao: payload.description,
                valor_servicos: (payload.amountCents / 100).toFixed(2),
                aliquota: config.issPct,
                item_lista_servico: config.serviceCode,
              }
            : undefined,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { status?: string; mensagem?: string; protocol?: string };
    if (!response.ok) {
      return { status: "REJECTED" as const, protocol: null, error: body.mensagem || `Provedor ${response.status}` };
    }
    const authorized = String(body.status ?? "").toLowerCase().includes("autoriz") || response.status === 202 || response.status === 201;
    return {
      status: authorized ? ("AUTHORIZED" as const) : ("PROCESSING" as const),
      protocol: body.protocol ?? null,
      error: null,
    };
  } catch (error) {
    return {
      status: "REJECTED" as const,
      protocol: null,
      error: error instanceof Error ? error.message : "Falha ao falar com o provedor.",
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
    const accessKey = buildAccessKey({
      uf: config.uf,
      issuedAt,
      cnpj: config.cnpj,
      kind,
      series: config.series,
      number,
    });
    const taxCents = taxCentsForKind(kind, amountCents, config.issPct);
    const ref = `mb-${tenant.slug}-${kind}-${number}`;
    const created = await prisma.fiscalInvoice.create({
      data: {
        tenantId,
        comandaId: comanda.id,
        clientId: comanda.clientId,
        kind,
        status: "PROCESSING",
        number,
        series: config.series,
        accessKey,
        environment: config.environment,
        provider: config.provider,
        providerRef: ref,
        amountCents,
        taxCents,
        notes: `Comanda #${comanda.number}`,
      },
    });

    const emitted = await emitOnProvider(config, {
      ref,
      kind,
      number,
      series: config.series,
      amountCents,
      taxCents,
      accessKey,
      description: comanda.items.map((item) => item.description).join(", ").slice(0, 180),
      recipient: { name: comanda.client.name, document: recipient.value },
    });

    const updated = await prisma.fiscalInvoice.update({
      where: { id: created.id },
      data: {
        status: emitted.status,
        protocol: emitted.protocol,
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
  await prisma.fiscalInvoice.update({
    where: { id: invoice.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return { ok: true as const };
}
