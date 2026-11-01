import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { formatBRL } from "@/lib/money";
import { Card } from "@/components/ui";

export default async function PlataformaCanaisPage() {
  await requirePlatformAdmin();
  const [invoices, partners, salons] = await Promise.all([
    prisma.platformInvoice.findMany({ where: { status: "PAID" }, select: { amountCents: true, partnerId: true, tenantId: true } }),
    prisma.partner.findMany({
      include: {
        tenant: { select: { name: true } },
        _count: { select: { referred: true } },
        commissions: { where: { status: { not: "CANCELED" } }, select: { commissionCents: true } },
      },
    }),
    prisma.tenant.findMany({
      where: { kind: "SALON", isPlatform: false },
      select: { id: true, partnerId: true, billingStatus: true },
    }),
  ]);

  const direct = invoices.filter((row) => !row.partnerId).reduce((sum, row) => sum + row.amountCents, 0);
  const viaPartner = invoices.filter((row) => row.partnerId).reduce((sum, row) => sum + row.amountCents, 0);
  const ranking = partners
    .map((partner) => ({
      name: partner.tenant.name,
      referred: partner._count.referred,
      commission: partner.commissions.reduce((sum, row) => sum + row.commissionCents, 0),
    }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 8);

  const referred = salons.filter((row) => row.partnerId);
  const churn = referred.filter((row) => row.billingStatus === "CANCELED").length;
  const payingTenants = new Set(invoices.filter((row) => row.partnerId).map((row) => row.tenantId));
  const ltv = payingTenants.size ? Math.round(viaPartner / payingTenants.size) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Canais</h1>
        <p className="mt-1 text-sm text-ink-soft">Receita direta da plataforma versus receita que chegou por parceiro.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-xs text-ink-soft">Receita direta</div>
          <div className="mt-1 font-display text-2xl">{formatBRL(direct)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">Receita via parceiros</div>
          <div className="mt-1 font-display text-2xl">{formatBRL(viaPartner)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">LTV médio do canal</div>
          <div className="mt-1 font-display text-2xl">{formatBRL(ltv)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">Churn no canal</div>
          <div className="mt-1 font-display text-2xl">{referred.length ? Math.round((churn / referred.length) * 100) : 0}%</div>
        </Card>
      </div>
      <Card>
        <div className="text-sm font-medium">Top afiliados</div>
        {ranking.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Ainda não há parceiros com comissão.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {ranking.map((row) => (
              <li key={row.name} className="flex justify-between py-2 text-sm">
                <span>
                  {row.name} · {row.referred} salão{row.referred === 1 ? "" : "ns"}
                </span>
                <span>{formatBRL(row.commission)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
