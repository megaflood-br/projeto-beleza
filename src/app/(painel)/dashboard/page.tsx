import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { occupancyPercent } from "@/lib/appointments";
import { rangeOfDay, formatTime } from "@/lib/dates";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { isLowStock } from "@/lib/stock";
import { fallbackInsight } from "@/lib/openai";

export default async function DashboardPage() {
  const { session, tenant } = await requireTenant();
  const { start, end } = rangeOfDay(new Date());

  const [appointments, income, expense, products, clients, pendingCommissions] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId: session.tenantId, startAt: { gte: start, lt: end } },
      include: { client: true, professional: true, items: { include: { service: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.transaction.aggregate({
      where: { tenantId: session.tenantId, type: "INCOME", occurredAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { tenantId: session.tenantId, type: "EXPENSE", occurredAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.product.findMany({ where: { tenantId: session.tenantId, active: true } }),
    prisma.client.count({ where: { tenantId: session.tenantId } }),
    prisma.commission.aggregate({
      where: { tenantId: session.tenantId, status: "PENDING" },
      _sum: { amountCents: true },
    }),
  ]);

  const busy = appointments
    .filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status))
    .reduce((sum, a) => sum + (a.endAt.getTime() - a.startAt.getTime()) / 60000, 0);
  const occupancy = occupancyPercent(busy, 4 * 10 * 60);
  const low = products.filter((p) => isLowStock(p.stock, p.minStock));
  const insight = fallbackInsight({
    revenueCents: income._sum.amountCents ?? 0,
    appointments: appointments.length,
    occupancy,
    noShows: appointments.filter((a) => a.status === "NO_SHOW").length,
    lowStock: low.length,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Bom atendimento</p>
        <h1 className="font-display text-4xl">{tenant.name}</h1>
        <p className="text-ink-soft">Agenda, caixa e relacionamento em um só lugar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Faturamento de hoje" value={formatBRL(income._sum.amountCents ?? 0)} hint="Entradas do dia" />
        <Stat title="Ocupação" value={`${occupancy}%`} hint={`${appointments.length} horários`} />
        <Stat title="Clientes" value={String(clients)} hint="Base do CRM" />
        <Stat title="Comissões em aberto" value={formatBRL(pendingCommissions._sum.amountCents ?? 0)} hint="A pagar" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Hoje na agenda</h2>
            <Link href="/agenda" className="text-sm text-wine">
              Abrir agenda
            </Link>
          </div>
          <div className="space-y-3">
            {appointments.length === 0 ? <p className="text-ink-soft">Nenhum horário hoje.</p> : null}
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-sand px-3 py-2">
                <div>
                  <div className="font-medium">{a.client.name}</div>
                  <div className="text-xs text-ink-soft">
                    {formatTime(a.startAt)} · {a.professional.name} · {a.items[0]?.service.name}
                  </div>
                </div>
                <span className="text-xs">{STATUS_LABEL[a.status as AppointmentStatus]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Insight Aura</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{insight}</p>
          <Link href="/ia" className="mt-4 inline-block text-sm font-medium text-wine">
            Conversar com a IA →
          </Link>
          <div className="mt-6 text-sm">
            <div className="font-medium">Estoque baixo</div>
            {low.length === 0 ? <p className="text-ink-soft">Nada crítico.</p> : null}
            {low.map((p) => (
              <div key={p.id} className="flex justify-between py-1">
                <span>{p.name}</span>
                <span>
                  {p.stock} / min {p.minStock}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-ink-soft">
            Despesas do dia: {formatBRL(expense._sum.amountCents ?? 0)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <div className="text-sm text-ink-soft">{title}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
      <div className="mt-1 text-xs text-gold">{hint}</div>
    </Card>
  );
}
