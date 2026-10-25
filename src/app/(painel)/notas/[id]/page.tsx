import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge, Card } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { formatMediumDate } from "@/lib/dates";
import {
  FISCAL_STATUS_COLOR,
  FISCAL_STATUS_LABEL,
  fiscalKindLabel,
  formatAccessKey,
  formatCnpj,
  formatCpf,
  isFiscalStatus,
  tenantFiscalConfig,
} from "@/lib/fiscal";
import { hasContoraArtifacts } from "@/lib/contora";

export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, tenant } = await requireTenant();
  const { id } = await params;
  const invoice = await prisma.fiscalInvoice.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { client: true, comanda: { include: { items: true } } },
  });
  if (!invoice) notFound();
  const config = tenantFiscalConfig(tenant);
  const status = isFiscalStatus(invoice.status) ? invoice.status : "DRAFT";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/notas" className="text-wine">
              Notas fiscais
            </Link>
          </p>
          <h1 className="font-display text-3xl">
            {fiscalKindLabel(invoice.kind)} {invoice.number ? `${invoice.series}-${invoice.number}` : ""}
          </h1>
        </div>
        <Badge color={FISCAL_STATUS_COLOR[status]}>{FISCAL_STATUS_LABEL[status]}</Badge>
      </div>

      <Card className="space-y-4 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{config.tradeName || config.issuerName}</div>
            <div className="text-sm text-ink-soft">{formatCnpj(config.cnpj)}</div>
            <div className="text-sm text-ink-soft">
              {config.address}
              {config.city ? ` · ${config.city}` : ""}
              {config.uf ? `/${config.uf}` : ""}
            </div>
          </div>
          <div className="text-right text-sm">
            <div>{invoice.environment === "prod" ? "Produção" : "Homologação"}</div>
            {invoice.issuedAt ? <div>{formatMediumDate(invoice.issuedAt)}</div> : null}
          </div>
        </div>

        <div className="rounded-xl bg-sand px-4 py-3 text-sm">
          <div className="font-medium">{invoice.client?.name ?? "Consumidor"}</div>
          <div className="text-ink-soft">
            {invoice.client?.cpf ? formatCpf(invoice.client.cpf) : invoice.client?.cnpj ? formatCnpj(invoice.client.cnpj) : "Documento não informado"}
          </div>
        </div>

        {invoice.comanda?.items.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-ink-soft">
              <tr>
                <th className="py-2">Item</th>
                <th>Qtd</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {invoice.comanda.items
                .filter((item) => (invoice.kind === "NFSE" ? item.type === "SERVICE" : item.type !== "SERVICE") || invoice.kind === "NFE")
                .map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="py-2">{item.description}</td>
                    <td>{item.quantity}</td>
                    <td className="text-right">{formatBRL(Math.round(item.quantity * item.priceCents) - item.discountCents)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : null}

        <div className="flex justify-between border-t border-line pt-3">
          <div className="text-sm text-ink-soft">
            {invoice.taxCents ? `ISS ${formatBRL(invoice.taxCents)}` : null}
            {invoice.protocol ? ` · Protocolo ${invoice.protocol}` : null}
          </div>
          <div className="font-display text-2xl">{formatBRL(invoice.amountCents)}</div>
        </div>

        <p className="break-all font-mono text-xs text-ink-soft">{formatAccessKey(invoice.accessKey)}</p>
        {invoice.notes ? <p className="text-sm text-ink-soft">{invoice.notes}</p> : null}
        {invoice.errorMessage ? <p className="text-sm text-red-600">{invoice.errorMessage}</p> : null}
        {hasContoraArtifacts(invoice) ? (
          <div className="flex flex-wrap gap-3">
            <a href={`/notas/${invoice.id}/arquivo?tipo=pdf`} className="text-sm font-medium text-wine">
              Baixar PDF
            </a>
            <a href={`/notas/${invoice.id}/arquivo?tipo=xml`} className="text-sm font-medium text-wine">
              Baixar XML
            </a>
          </div>
        ) : invoice.provider === "local" ? (
          <p className="text-xs text-ink-soft">Nota local de treino: use a impressão do navegador. XML e PDF oficiais saem depois da autorização na Contora.</p>
        ) : null}
      </Card>

      <Link href="/notas" className="print:hidden text-sm font-medium text-wine">
        Voltar às notas
      </Link>
    </div>
  );
}
