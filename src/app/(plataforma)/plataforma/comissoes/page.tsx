import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { CommissionsBoard } from "@/components/plataforma/commissions-board";
import { summarizePartnerLedger } from "@/lib/partners";
import { formatMediumDate } from "@/lib/dates";

export default async function PlataformaComissoesPage() {
  await requirePlatformAdmin();
  const [partners, rows] = await Promise.all([
    prisma.partner.findMany({
      include: {
        tenant: { select: { name: true } },
        commissions: { select: { status: true, type: true, commissionCents: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnerCommission.findMany({
      include: {
        partner: { include: { tenant: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.tenantId))] } },
    select: { id: true, name: true },
  });
  const tenantName = new Map(tenants.map((row) => [row.id, row.name]));

  return (
    <CommissionsBoard
      partners={partners.map((partner) => ({
        id: partner.id,
        name: partner.tenant.name,
        availableCents: summarizePartnerLedger(partner.commissions).available,
      }))}
      rows={rows.map((row) => ({
        id: row.id,
        partnerName: row.partner.tenant.name,
        partnerId: row.partnerId,
        tenantName: tenantName.get(row.tenantId) ?? "—",
        type: row.type,
        status: row.status,
        commissionCents: row.commissionCents,
        createdAt: formatMediumDate(row.createdAt),
      }))}
    />
  );
}
