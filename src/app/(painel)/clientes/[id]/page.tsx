import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
import { ClientPanel, isClientTab } from "@/components/clientes/client-panel";
import { buildClientMetrics } from "@/lib/client-metrics";
import { anamnesisAreasForAccess, ensureAnamnesisForms, formAllowedByAreas, mapAnamnesisRow, mapFormRow } from "@/lib/anamnesis";
import { canAccess, shouldHidePhones } from "@/lib/permissions";
import { redactPhone } from "@/lib/utils";

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session, tenant, access } = await requireTenant();
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
      cashbackMoves: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });
  if (!client) notFound();

  const hidePhones = shouldHidePhones(access);
  const areas = await anamnesisAreasForAccess(session.tenantId, access);
  const ownOnly = Boolean(access.professionalId && !canAccess(access, "anamnesis", "viewAll"));
  const [forms, professionals] = await Promise.all([
    prisma.anamnesisForm.findMany({
      where: { tenantId: session.tenantId },
      include: { _count: { select: { records: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.professional.findMany({
      where: {
        tenantId: session.tenantId,
        active: true,
        ...(ownOnly ? { id: access.professionalId ?? "__none__" } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const visibleForms = forms.map(mapFormRow).filter((form) => formAllowedByAreas(areas, form.area));
  const visibleIds = new Set(visibleForms.map((form) => form.id));

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
      hidePhones={hidePhones}
      client={{ ...client, phone: redactPhone(client.phone, hidePhones) }}
      metrics={metrics}
      appointments={client.appointments}
      comandas={client.comandas}
      packages={client.packages}
      messages={messages}
      anamneses={client.anamneses
        .map(mapAnamnesisRow)
        .filter((row) => visibleIds.has(row.formId))
        .map((row) => ({ ...row, clientPhone: redactPhone(row.clientPhone, hidePhones) }))}
      forms={visibleForms}
      professionals={professionals}
      canCreateAnamnesis={canAccess(access, "anamnesis", "create")}
      canEditAnamnesis={canAccess(access, "anamnesis", "edit")}
      salonName={tenant.name}
      cashbackEnabled={tenant.cashbackEnabled}
      cashbackCentsPerPoint={tenant.cashbackCentsPerPoint}
      cashbackMoves={client.cashbackMoves.map((move) => ({
        id: move.id,
        type: (["EARN", "REDEEM", "MANUAL", "ADJUST"].includes(move.type) ? move.type : "ADJUST") as
          | "EARN"
          | "REDEEM"
          | "MANUAL"
          | "ADJUST",
        amountCents: move.amountCents,
        points: move.points,
        reason: move.reason,
        createdByName: move.createdByName,
        createdAt: move.createdAt.toISOString(),
      }))}
    />
  );
}
