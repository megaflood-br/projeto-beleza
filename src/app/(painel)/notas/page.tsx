import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { comandaTotal } from "@/lib/comandas";
import { fiscalReady, tenantFiscalConfig } from "@/lib/fiscal";
import { InvoiceBoard } from "@/components/notas/invoice-board";

export default async function NotasPage() {
  const { session, tenant } = await requireTenant();
  const canManage = canSeeFinance(session.role);
  if (!canManage) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Notas fiscais</h1>
        <p className="text-ink-soft">Somente administradores emitem e cancelam notas.</p>
      </div>
    );
  }

  const config = tenantFiscalConfig(tenant);
  const [invoices, comandas] = await Promise.all([
    prisma.fiscalInvoice.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, comanda: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comanda.findMany({
      where: { tenantId: session.tenantId, status: "CLOSED" },
      include: { client: true, items: true, invoices: { select: { kind: true, status: true } } },
      orderBy: { occurredAt: "desc" },
      take: 80,
    }),
  ]);

  const openComandas = comandas
    .filter((comanda) => !comanda.invoices.some((invoice) => invoice.status === "AUTHORIZED" || invoice.status === "PROCESSING"))
    .map((comanda) => ({
      id: comanda.id,
      number: comanda.number,
      clientName: comanda.client.name,
      totalCents: comandaTotal({
        items: comanda.items,
        discountCents: comanda.discountCents,
        creditCents: comanda.creditCents,
        cashbackCents: comanda.cashbackCents,
      }),
      occurredAt: comanda.occurredAt.toISOString(),
    }));

  return (
    <InvoiceBoard
      ready={fiscalReady(config)}
      issuerCnpj={config.cnpj}
      canManage={canManage}
      comandas={openComandas}
      invoices={invoices.map((invoice) => ({
        id: invoice.id,
        kind: invoice.kind,
        status: invoice.status,
        number: invoice.number,
        series: invoice.series,
        accessKey: invoice.accessKey,
        protocol: invoice.protocol,
        amountCents: invoice.amountCents,
        taxCents: invoice.taxCents,
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        clientName: invoice.client?.name ?? "Consumidor",
        comandaNumber: invoice.comanda?.number ?? null,
        comandaId: invoice.comandaId,
        environment: invoice.environment,
        errorMessage: invoice.errorMessage,
      }))}
    />
  );
}
