import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ensureSalonPops } from "@/lib/ensure-pops";
import { absolutePopUrl, effectivePopSigner, popByKey, popPublicUrl, salonCompany } from "@/lib/pops";
import { qrDataUrl } from "@/lib/qr";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { PopBoard } from "@/components/pops/pop-board";
import { ArchiveBoard } from "@/components/documentacao/archive-board";
import { calendarDate, formatMediumDate } from "@/lib/dates";
import { uploadToDataUrl } from "@/lib/product-upload";
import {
  compareDocuments,
  DOCUMENTATION_TABS,
  documentationPath,
  isArchiveTab,
  isDocumentKind,
  kindForTab,
  parseDocumentationTab,
  type ArchiveTab,
} from "@/lib/documentation";

export default async function DocumentacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  const params = await searchParams;
  const tab = parseDocumentationTab(params.tab);
  const current = DOCUMENTATION_TABS.find((item) => item.id === tab) ?? DOCUMENTATION_TABS[0];
  const canManage = canManageTeam(session.role);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Documentação</h1>
        <p className="text-ink-soft">{current.description}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {DOCUMENTATION_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={documentationPath(item.id)}
              className={cn(
                "-mb-px inline-flex items-center border-b-2 px-4 py-2.5 text-sm",
                active ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {isArchiveTab(tab) ? (
        <ArchivePanel tenantId={session.tenantId} tab={tab} canManage={canManage} />
      ) : (
        <PopsPanel tenant={tenant} tenantId={session.tenantId} canManage={canManage} />
      )}
    </div>
  );
}

async function PopsPanel({
  tenant,
  tenantId,
  canManage,
}: {
  tenant: Awaited<ReturnType<typeof requireTenant>>["tenant"];
  tenantId: string;
  canManage: boolean;
}) {
  const [rows, server, owner, logo] = await Promise.all([
    ensureSalonPops(tenantId),
    resolvePlatformIntegrations(),
    prisma.user.findFirst({
      where: { tenantId, active: true, role: { in: ["OWNER", "MANAGER"] } },
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

  return <PopBoard embedded canManage={canManage} company={company} pops={pops} />;
}

async function ArchivePanel({
  tenantId,
  tab,
  canManage,
}: {
  tenantId: string;
  tab: ArchiveTab;
  canManage: boolean;
}) {
  const kind = kindForTab(tab);
  const hasDocs = typeof prisma.salonDocument?.findMany === "function";
  const [documents, professionals] = await Promise.all([
    hasDocs
      ? prisma.salonDocument.findMany({
          where: { tenantId, kind },
          include: { professional: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.professional.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const rows = documents
    .map((row) => ({
      id: row.id,
      kind: isDocumentKind(row.kind) ? row.kind : kind,
      title: row.title,
      number: row.number,
      issuer: row.issuer,
      issuedAt: row.issuedAt ? calendarDate(row.issuedAt) : null,
      expiresAt: row.expiresAt ? calendarDate(row.expiresAt) : null,
      fileName: row.fileName,
      notes: row.notes,
      professionalId: row.professionalId,
      professionalName: row.professional?.name ?? null,
    }))
    .sort(compareDocuments);

  return <ArchiveBoard tab={tab} canManage={canManage} documents={rows} professionals={professionals} />;
}
