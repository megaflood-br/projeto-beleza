import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { absolutePopUrl, effectivePopSigner, popByKey, popPublicUrl, salonCompany } from "@/lib/pops";
import { qrDataUrl } from "@/lib/qr";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { PopDocument } from "@/components/pops/pop-document";
import { formatMediumDate } from "@/lib/dates";
import { PrintButton } from "@/components/pops/print-button";
import { uploadToDataUrl } from "@/lib/product-upload";

export default async function PublicPopPage({ params }: { params: Promise<{ slug: string; popSlug: string }> }) {
  const { slug, popSlug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.kind === "SUPPLIER") notFound();

  const row = await prisma.salonPop.findFirst({
    where: { tenantId: tenant.id, slug: popSlug },
    include: { service: { select: { name: true } } },
  });
  if (!row) notFound();
  const template = popByKey(row.templateKey);
  if (!template) notFound();

  const server = await resolvePlatformIntegrations();
  const publicUrl = absolutePopUrl(popPublicUrl(server.publicAppUrl || tenant.publicAppUrl || "", tenant.slug, row.slug));
  const absolute = publicUrl;
  const qr = await qrDataUrl(absolute);
  const logo = await uploadToDataUrl(tenant.logoUrl);
  const company = { ...salonCompany(tenant), logoUrl: logo || tenant.logoUrl || "" };
  const signed = effectivePopSigner(template.signer, row, {
    technicalResponsible: tenant.technicalResponsible,
    technicalRegistry: tenant.technicalRegistry,
  });

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-soft">POP · {company.tradeName}</p>
          <h1 className="font-display text-2xl">{row.title}</h1>
        </div>
        <PrintButton />
      </div>
      <PopDocument
        company={company}
        template={template}
        qr={qr}
        publicUrl={absolute}
        pop={{
          title: row.title,
          code: template.code,
          revision: row.revision,
          responsible: signed.responsible,
          registry: signed.registry,
          products: row.products,
          frequency: row.frequency,
          notes: row.notes,
          serviceName: row.service?.name,
          updatedAt: formatMediumDate(row.updatedAt),
        }}
      />
    </main>
  );
}
