import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { ensureSalonPops } from "@/lib/ensure-pops";
import { absolutePopUrl, effectivePopSigner, popByKey, popPublicUrl, salonCompany } from "@/lib/pops";
import { qrDataUrl } from "@/lib/qr";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { PopBoard } from "@/components/pops/pop-board";
import { formatMediumDate } from "@/lib/dates";
import { uploadToDataUrl } from "@/lib/product-upload";

export default async function PopsPage() {
  const { session, tenant } = await requireTenant();
  const [rows, server, owner, logo] = await Promise.all([
    ensureSalonPops(session.tenantId),
    resolvePlatformIntegrations(),
    prisma.user.findFirst({
      where: { tenantId: session.tenantId, active: true, role: { in: ["OWNER", "MANAGER"] } },
      orderBy: { createdAt: "asc" },
      select: { name: true },
    }),
    uploadToDataUrl(tenant.logoUrl),
  ]);
  const company = { ...salonCompany(tenant), logoUrl: logo || tenant.logoUrl || "" };
  const signerTenant = {
    technicalResponsible: tenant.technicalResponsible,
    technicalRegistry: tenant.technicalRegistry,
    companyResponsible: owner?.name ?? "",
  };

  const pops = await Promise.all(
    rows.map(async (row) => {
      const template = popByKey(row.templateKey);
      const publicUrl = popPublicUrl(server.publicAppUrl || tenant.publicAppUrl || "", tenant.slug, row.slug);
      const signed = effectivePopSigner(template?.signer ?? "COMPANY", row, signerTenant);
      return {
        id: row.id,
        slug: row.slug,
        templateKey: row.templateKey,
        title: row.title,
        code: template?.code ?? "POP",
        revision: row.revision,
        responsible: signed.responsible,
        registry: signed.registry,
        products: row.products,
        frequency: row.frequency,
        notes: row.notes,
        serviceId: row.serviceId,
        serviceName: row.service?.name ?? null,
        active: row.active,
        updatedAt: formatMediumDate(row.updatedAt),
        publicUrl,
        qr: await qrDataUrl(absolutePopUrl(publicUrl)),
      };
    }),
  );

  return <PopBoard canManage={canManageTeam(session.role)} company={company} pops={pops} />;
}
