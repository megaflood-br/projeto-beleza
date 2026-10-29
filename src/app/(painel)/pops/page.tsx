import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { ensureSalonPops } from "@/lib/ensure-pops";
import { absolutePopUrl, popByKey, popPublicUrl, salonCompany } from "@/lib/pops";
import { qrDataUrl } from "@/lib/qr";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { PopBoard } from "@/components/pops/pop-board";
import { formatMediumDate } from "@/lib/dates";

export default async function PopsPage() {
  const { session, tenant } = await requireTenant();
  const [rows, server] = await Promise.all([ensureSalonPops(session.tenantId), resolvePlatformIntegrations()]);
  const company = salonCompany(tenant);

  const pops = await Promise.all(
    rows.map(async (row) => {
      const template = popByKey(row.templateKey);
      const publicUrl = popPublicUrl(server.publicAppUrl || tenant.publicAppUrl || "", tenant.slug, row.slug);
      return {
        id: row.id,
        slug: row.slug,
        templateKey: row.templateKey,
        title: row.title,
        code: template?.code ?? "POP",
        revision: row.revision,
        responsible: row.responsible,
        registry: row.registry,
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
