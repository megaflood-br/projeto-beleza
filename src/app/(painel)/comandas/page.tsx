import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { ComandaBoard } from "@/components/comandas/comanda-board";
import { calendarDate } from "@/lib/dates";
import { comandaTotal } from "@/lib/comandas";
import { loadFinanceCatalog } from "@/lib/finance-catalog";
import { decorateCatalogItem } from "@/lib/promotions";
import { loadPromoRules } from "@/lib/promo-load";

export default async function ComandasPage() {
  const { session } = await requireTenant();
  const [comandas, clients, professionals, services, products, last, catalog, promos] = await Promise.all([
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
    loadPromoRules(session.tenantId),
  ]);
  const today = calendarDate();
  const pricedServices = services.map((service) => decorateCatalogItem(promos, today, "SERVICE", service));
  const pricedProducts = products.map((product) =>
    decorateCatalogItem(promos, today, "PRODUCT", { id: product.id, name: product.name, priceCents: product.saleCents }),
  );

  return (
    <ComandaBoard
      nextNumber={(last?.number ?? 0) + 1}
      clients={clients}
      professionals={professionals}
      services={pricedServices}
      products={pricedProducts}
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
