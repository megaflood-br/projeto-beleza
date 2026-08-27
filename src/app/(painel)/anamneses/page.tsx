import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { AnamnesisBoard } from "@/components/anamneses/anamnesis-board";
import { ensureAnamnesisForms, mapAnamnesisRow, mapFormRow } from "@/lib/anamnesis";

export default async function AnamnesesPage() {
  const { session } = await requireTenant();
  await ensureAnamnesisForms(session.tenantId);

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
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AnamnesisBoard
      records={records.map(mapAnamnesisRow)}
      forms={forms.map(mapFormRow)}
      clients={clients}
      professionals={professionals}
    />
  );
}
