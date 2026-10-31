import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/tenant";
import { formatBRL } from "@/lib/money";
import { conversionRate, monthKey, summarizePartnerLedger } from "@/lib/partners";
import { Card } from "@/components/ui";

export default async function ParceiroPage() {
  const { partner } = await requirePartner();
  const [referred, commissions, paying] = await Promise.all([
    prisma.tenant.findMany({
      where: { partnerId: partner.id, kind: "SALON" },
      select: { id: true, status: true, billingStatus: true, createdAt: true },
    }),
    prisma.partnerCommission.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.platformInvoice.groupBy({
      by: ["tenantId"],
      where: { partnerId: partner.id, status: "PAID" },
    }),
  ]);

  const ledger = summarizePartnerLedger(commissions);
  const active = referred.filter((row) => row.billingStatus === "ACTIVE" || row.status === "ACTIVE").length;
  const rate = conversionRate(referred.length, paying.length);
  const months = new Map<string, { sale: number; commission: number }>();
  for (const row of commissions) {
    const key = monthKey(row.createdAt);
    const current = months.get(key) ?? { sale: 0, commission: 0 };
    current.sale += row.saleCents;
    current.commission += row.commissionCents;
    months.set(key, current);
  }
  const chart = [...months.entries()].slice(-8);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Painel</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Comissão de {partner.commissionBps / 100}% em toda fatura paga dos salões que entraram pelo seu link.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs text-ink-soft">Total ganho</div>
          <div className="mt-1 font-display text-2xl">{formatBRL(ledger.earned)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">Disponível para saque</div>
          <div className="mt-1 font-display text-2xl">{formatBRL(ledger.available)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">A receber</div>
          <div className="mt-1 font-display text-2xl">{formatBRL(ledger.pending)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">Clientes / conversão</div>
          <div className="mt-1 font-display text-2xl">
            {active}
            <span className="ml-2 text-base font-normal text-ink-soft">{rate}%</span>
          </div>
        </Card>
      </div>
      <Card>
        <div className="text-sm font-medium">Comissões por mês</div>
        {chart.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Ainda não há faturas pagas pelos seus indicados.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {chart.map(([month, values]) => (
              <div key={month} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
                <span className="text-ink-soft">{month}</span>
                <div className="h-2 overflow-hidden rounded-full bg-sand">
                  <div
                    className="h-full bg-wine"
                    style={{ width: `${Math.min(100, values.commission / Math.max(values.sale, 1) * 100)}%` }}
                  />
                </div>
                <span>{formatBRL(values.commission)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
