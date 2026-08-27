import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { ClientPanel, isClientTab } from "@/components/clientes/client-panel";
import { buildClientMetrics } from "@/lib/client-metrics";
import { ensureAnamnesisForms, mapAnamnesisRow, mapFormRow } from "@/lib/anamnesis";

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session } = await requireTenant();
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = isClientTab(tabParam) ? tabParam : "painel";
  await ensureAnamnesisForms(session.tenantId);

  const client = await prisma.client.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      appointments: {
        include: {
          professional: true,
          comanda: { select: { id: true, status: true } },
          items: { include: { service: true, professional: true } },
        },
        orderBy: { startAt: "desc" },
      },
      packages: { include: { package: true } },
      conversations: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      comandas: {
        include: { professional: true, items: { include: { product: true, professional: true } } },
        orderBy: { createdAt: "desc" },
      },
      anamneses: {
        include: { client: true, form: true, professional: true },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!client) notFound();

  const [forms, professionals] = await Promise.all([
    prisma.anamnesisForm.findMany({
      where: { tenantId: session.tenantId },
      include: { _count: { select: { records: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const metrics = buildClientMetrics({
    createdAt: client.createdAt,
    creditCents: client.creditCents,
    cashbackCents: client.cashbackCents,
    appointments: client.appointments,
    packages: client.packages,
    comandas: client.comandas,
  });

  const messages = client.conversations.flatMap((c) => c.messages);

  return (
    <ClientPanel
      tab={tab}
      client={client}
      metrics={metrics}
      appointments={client.appointments}
      comandas={client.comandas}
      packages={client.packages}
      messages={messages}
      anamneses={client.anamneses.map(mapAnamnesisRow)}
      forms={forms.map(mapFormRow)}
      professionals={professionals}
    />
  );
}
