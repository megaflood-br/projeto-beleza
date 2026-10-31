import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/tenant";
import { formatBRL } from "@/lib/money";
import { planLabel } from "@/lib/plans";
import { listPlatformPlans } from "@/lib/plans";
import { BILLING_STATUS_COLOR, BILLING_STATUS_LABEL, isBillingStatus } from "@/lib/partners";
import { Badge } from "@/components/ui";
import { formatMediumDate } from "@/lib/dates";

export default async function ParceiroClientesPage() {
  const { partner } = await requirePartner();
  const catalog = await listPlatformPlans();
  const tenants = await prisma.tenant.findMany({
    where: { partnerId: partner.id, kind: "SALON" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      plan: true,
      status: true,
      billingStatus: true,
      createdAt: true,
    },
  });
  const commissions = await prisma.partnerCommission.groupBy({
    by: ["tenantId"],
    where: { partnerId: partner.id, status: { not: "CANCELED" } },
    _sum: { commissionCents: true },
  });
  const byTenant = new Map(commissions.map((row) => [row.tenantId, row._sum.commissionCents ?? 0]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Clientes</h1>
        <p className="mt-1 text-sm text-ink-soft">Salões que assinaram pelo seu link. Sem dados das clientes finais do salão.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {tenants.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum salão indicado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Salão</th>
                <th className="font-medium">Plano</th>
                <th className="font-medium">Assinatura</th>
                <th className="font-medium">Entrada</th>
                <th className="px-4 font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const billing = isBillingStatus(tenant.billingStatus) ? tenant.billingStatus : tenant.status === "TRIAL" ? "TRIAL" : "NONE";
                return (
                  <tr key={tenant.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td>{planLabel(tenant.plan, catalog)}</td>
                    <td>
                      <Badge color={BILLING_STATUS_COLOR[billing]}>{BILLING_STATUS_LABEL[billing]}</Badge>
                    </td>
                    <td className="text-ink-soft">{formatMediumDate(tenant.createdAt)}</td>
                    <td className="px-4">{formatBRL(byTenant.get(tenant.id) ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
