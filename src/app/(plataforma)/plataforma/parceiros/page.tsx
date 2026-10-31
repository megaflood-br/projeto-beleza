import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { PartnersBoard } from "@/components/plataforma/partners-board";
import { isPartnerStatus, summarizePartnerLedger } from "@/lib/partners";
import type { PartnerAccountRow } from "@/components/plataforma/partner-types";

export default async function PlataformaParceirosPage() {
  await requirePlatformAdmin();
  const partners = await prisma.partner.findMany({
    include: {
      tenant: true,
      user: true,
      brand: true,
      commissions: { select: { status: true, type: true, commissionCents: true } },
      _count: { select: { referred: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const accounts: PartnerAccountRow[] = partners.map((partner) => {
    const ledger = summarizePartnerLedger(partner.commissions);
    return {
      id: partner.id,
      tenantId: partner.tenantId,
      name: partner.tenant.name,
      slug: partner.slug,
      ownerName: partner.user.name,
      ownerEmail: partner.user.email,
      status: isPartnerStatus(partner.status) ? partner.status : "PENDING",
      commissionBps: partner.commissionBps,
      brandName: partner.brand?.name || partner.tenant.name,
      primary: partner.brand?.primary || "#ff0447",
      referred: partner._count.referred,
      earnedCents: ledger.earned,
      availableCents: ledger.available,
      pixKey: partner.pixKey,
    };
  });

  return <PartnersBoard accounts={accounts} />;
}
