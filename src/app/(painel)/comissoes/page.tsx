import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { calendarDate, shiftCalendarDate } from "@/lib/dates";
import { availableCommission, consumedProductCents } from "@/lib/commissions";
import { CommissionBoard } from "@/components/comissoes/commission-board";
import type { CommissionRow } from "@/components/comissoes/types";
import { loadFinanceCatalog } from "@/lib/finance-catalog";

type ProductUsage = { quantity: number; product: { costCents: number } };

function usagesCost(usages: ProductUsage[]) {
  return consumedProductCents(usages.map((u) => ({ quantity: u.quantity, costCents: u.product.costCents })));
}

export default async function ComissoesPage() {
  const { session } = await requireTenant();
  const today = calendarDate();
  const defaultFrom = shiftCalendarDate(today, -30);
  const [commissions, professionals, catalog] = await Promise.all([
    prisma.commission.findMany({
      where: { tenantId: session.tenantId },
      include: {
        professional: true,
        appointment: {
          include: {
            client: true,
            items: { include: { service: { include: { products: { include: { product: true } } } } } },
          },
        },
        comanda: {
          include: {
            client: true,
            items: { include: { service: { include: { products: { include: { product: true } } } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, commissionPct: true, receivesCommission: true },
    }),
    loadFinanceCatalog(session.tenantId),
  ]);

  const rows: CommissionRow[] = commissions.map((c) => {
    const client = c.appointment?.client ?? c.comanda?.client;
    const serviceItem =
      c.appointment?.items[0] ??
      c.comanda?.items.find((item) => item.type === "SERVICE" && (item.professionalId === c.professionalId || !item.professionalId)) ??
      c.comanda?.items.find((item) => item.type === "SERVICE");
    const service = serviceItem && "service" in serviceItem ? serviceItem.service : null;
    const extraCostCents = service?.extraCostCents ?? 0;
    const consumedCents = service?.products ? usagesCost(service.products) : 0;
    const occurred = c.appointment?.startAt ?? c.comanda?.occurredAt ?? c.createdAt;
    const typeLabel = service?.commissionPct != null ? "Serviço" : "Normal";
    return {
      id: c.id,
      date: calendarDate(occurred),
      professionalId: c.professionalId,
      professionalName: c.professional.name,
      clientName: client?.name ?? "Avulsa",
      clientId: client?.id ?? null,
      refLabel: c.comanda ? `#${c.comanda.number}` : null,
      refHref: c.comanda ? `/comandas/${c.comanda.id}` : null,
      serviceName: service?.name ?? (c.comanda?.items[0]?.description ?? "Serviço"),
      quantity: serviceItem && "quantity" in serviceItem ? Number(serviceItem.quantity) || 1 : 1,
      extraCostCents,
      feeCents: 0,
      feePct: null,
      percent: c.percent,
      typeLabel,
      assistantDiscountCents: 0,
      consumedCents,
      amountCents: c.amountCents,
      availableCents: availableCommission({ amountCents: c.amountCents, extraCostCents, consumedCents }),
      status: c.status === "PAID" ? "PAID" : "PENDING",
    };
  });

  return (
    <CommissionBoard
      rows={rows}
      professionals={professionals}
      accounts={catalog.accounts}
      methods={catalog.methods}
      defaultFrom={defaultFrom}
      defaultTo={today}
    />
  );
}
