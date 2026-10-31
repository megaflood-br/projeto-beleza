import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/tenant";
import { formatBRL } from "@/lib/money";
import {
  COMMISSION_STATUS_LABEL,
  COMMISSION_TYPE_LABEL,
  PAYOUT_STATUS_LABEL,
  summarizePartnerLedger,
} from "@/lib/partners";
import { savePartnerPayoutInfo } from "@/app/actions/partner-brand";
import { Button, Card, Field, Input } from "@/components/ui";
import { formAction } from "@/lib/utils";
import { formatMediumDate } from "@/lib/dates";

export default async function ParceiroFinanceiroPage() {
  const { partner } = await requirePartner();
  const [lines, payouts] = await Promise.all([
    prisma.partnerCommission.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      include: { invoice: { select: { amountCents: true, paidAt: true } } },
    }),
    prisma.partnerPayout.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const ledger = summarizePartnerLedger(lines);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Financeiro</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Disponível {formatBRL(ledger.available)} · a receber {formatBRL(ledger.pending)} · já pago {formatBRL(ledger.paid)}
        </p>
      </div>
      <Card>
        <form action={formAction(savePartnerPayoutInfo)} className="grid gap-3 sm:grid-cols-2">
          <Field label="Chave Pix">
            <Input name="pixKey" defaultValue={partner.pixKey ?? ""} />
          </Field>
          <Field label="Tipo">
            <Input name="pixKeyType" defaultValue={partner.pixKeyType ?? "EVP"} placeholder="CPF, CNPJ, EMAIL, PHONE, EVP" />
          </Field>
          <Field label="Banco">
            <Input name="bankName" defaultValue={partner.bankName ?? ""} />
          </Field>
          <Field label="Agência / conta">
            <div className="grid grid-cols-2 gap-2">
              <Input name="bankAgency" defaultValue={partner.bankAgency ?? ""} placeholder="Agência" />
              <Input name="bankAccount" defaultValue={partner.bankAccount ?? ""} placeholder="Conta" />
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Button>Salvar dados de recebimento</Button>
          </div>
        </form>
      </Card>
      <Card>
        <div className="text-sm font-medium">Extrato</div>
        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nenhuma comissão ainda. Elas entram quando o salão indicado pagar a fatura no Asaas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {lines.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <div className="font-medium">
                    {COMMISSION_TYPE_LABEL[line.type as keyof typeof COMMISSION_TYPE_LABEL] ?? line.type}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {formatMediumDate(line.createdAt)} · {COMMISSION_STATUS_LABEL[line.status as keyof typeof COMMISSION_STATUS_LABEL] ?? line.status}
                  </div>
                </div>
                <div className={line.commissionCents < 0 ? "text-red-600" : ""}>{formatBRL(line.commissionCents)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <div className="text-sm font-medium">Repasses</div>
        {payouts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nenhum saque registrado. A plataforma dá baixa quando o Pix é enviado.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex justify-between py-2 text-sm">
                <span>
                  {formatMediumDate(payout.createdAt)} · {PAYOUT_STATUS_LABEL[payout.status as keyof typeof PAYOUT_STATUS_LABEL] ?? payout.status}
                </span>
                <span>{formatBRL(payout.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
