import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { ComandaBoard } from "@/components/comandas/comanda-board";
import { calendarDate } from "@/lib/dates";
import { comandaTotal } from "@/lib/comandas";
import { loadFinanceCatalog } from "@/lib/finance-catalog";

export default async function ComandasPage() {
  const { session } = await requireTenant();
  const [comandas, clients, professionals, services, products, last, catalog] = await Promise.all([
    prisma.comanda.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, professional: true, items: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.client.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, creditCents: true, cashbackCents: true },
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceCents: true },
    }),
    prisma.product.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, saleCents: true },
    }),
    prisma.comanda.findFirst({
      where: { tenantId: session.tenantId },
      orderBy: { number: "desc" },
      select: { number: true },
    }),
    loadFinanceCatalog(session.tenantId),
  ]);

  return (
    <ComandaBoard
      nextNumber={(last?.number ?? 0) + 1}
      clients={clients}
      professionals={professionals}
      services={services}
      products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.saleCents }))}
      paymentMethods={catalog.methods.filter((m) => m.active)}
      comandas={comandas.map((c) => ({
        id: c.id,
        number: c.number,
        clientId: c.clientId,
        clientName: c.client.name,
        professionalId: c.professionalId,
        status: c.status,
        notes: c.notes,
        discountCents: c.discountCents,
        creditCents: c.creditCents,
        cashbackCents: c.cashbackCents,
        paymentMethod: c.paymentMethod,
        occurredAt: calendarDate(c.occurredAt),
        totalCents: comandaTotal({
          items: c.items,
          discountCents: c.discountCents,
          creditCents: c.creditCents,
          cashbackCents: c.cashbackCents,
        }),
        items: c.items.map((item) => ({
          key: item.id,
          type: item.type === "PRODUCT" ? "PRODUCT" : "SERVICE",
          catalogId: item.productId ?? item.serviceId ?? "",
          professionalId: item.professionalId ?? c.professionalId ?? "",
          quantity: item.quantity,
          priceCents: item.priceCents,
          discount: (item.discountCents / 100).toFixed(2).replace(".", ","),
          discountType: "money" as const,
        })),
      }))}
    />
  );
}
