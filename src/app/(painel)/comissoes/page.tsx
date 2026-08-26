import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card } from "@/components/ui";
import { payCommissions } from "@/app/actions/finance";
import { formatBRL } from "@/lib/money";
import { sumCommissions } from "@/lib/commissions";
import { formAction } from "@/lib/utils";

export default async function ComissoesPage() {
  const { session } = await requireTenant();
  const professionals = await prisma.professional.findMany({
    where: { tenantId: session.tenantId },
    include: { commissions: { include: { appointment: { include: { client: true } }, comanda: { include: { client: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Comissões</h1>
        <form action={formAction(payCommissions)}>
          <Button>Marcar todas como pagas</Button>
        </form>
      </div>
      <div className="grid gap-4">
        {professionals.map((p) => {
          const totals = sumCommissions(p.commissions);
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-2xl">{p.name}</div>
                  <div className="text-sm text-ink-soft">Regra padrão: {p.commissionPct}%</div>
                </div>
                <div className="text-right text-sm">
                  <div>Pendente {formatBRL(totals.pending)}</div>
                  <div className="text-ink-soft">Pago {formatBRL(totals.paid)}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {p.commissions.slice(0, 8).map((c) => (
                  <div key={c.id} className="flex justify-between border-t border-line pt-2">
                    <span>
                      {c.appointment?.client.name ?? c.comanda?.client.name ?? "Avulsa"} · {c.percent}%
                    </span>
                    <span>
                      {formatBRL(c.amountCents)} · {c.status === "PAID" ? "pago" : "a pagar"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
