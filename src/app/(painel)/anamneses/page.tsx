import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { AnamnesisBoard } from "@/components/anamneses/anamnesis-board";
import { anamnesisAreasForAccess, ensureAnamnesisForms, formAllowedByAreas, mapAnamnesisRow, mapFormRow } from "@/lib/anamnesis";
import { canAccess, shouldHidePhones } from "@/lib/permissions";
import { redactPhone } from "@/lib/utils";

export default async function AnamnesesPage() {
  const { session, tenant, access } = await requireTenant();
  await ensureAnamnesisForms(session.tenantId);
  const hidePhones = shouldHidePhones(access);
  const areas = await anamnesisAreasForAccess(session.tenantId, access);
  const ownOnly = Boolean(access.professionalId && !canAccess(access, "anamnesis", "viewAll"));

  const [records, forms, clients, professionals] = await Promise.all([
    prisma.anamnesis.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, form: true, professional: true },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.anamnesisForm.findMany({
      where: { tenantId: session.tenantId },
      include: { _count: { select: { records: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.client.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
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

  return (
    <AnamnesisBoard
      records={records
        .map(mapAnamnesisRow)
        .filter((row) => visibleIds.has(row.formId))
        .map((row) => ({ ...row, clientPhone: redactPhone(row.clientPhone, hidePhones) }))}
      forms={visibleForms}
      hidePhones={hidePhones}
      clients={clients.map((client) => ({ ...client, phone: redactPhone(client.phone, hidePhones) }))}
      professionals={professionals}
      salonName={tenant.name}
      scoped={!canAccess(access, "anamnesis", "viewAll")}
      canCreate={canAccess(access, "anamnesis", "create")}
      canEdit={canAccess(access, "anamnesis", "edit")}
      canManageForms={canAccess(access, "anamnesis", "edit")}
    />
  );
}
