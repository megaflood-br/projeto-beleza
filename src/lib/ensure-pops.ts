import { prisma } from "@/lib/db";
import {
  POP_CATALOG,
  matchServicePop,
  uniquePopSlug,
} from "@/lib/pops";

export async function ensureSalonPops(tenantId: string) {
  const [existing, services, owner] = await Promise.all([
    prisma.salonPop.findMany({ where: { tenantId }, select: { id: true, templateKey: true, serviceId: true, slug: true } }),
    prisma.service.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findFirst({
      where: { tenantId, active: true, role: { in: ["OWNER", "MANAGER"] } },
      orderBy: { createdAt: "asc" },
      select: { name: true },
    }),
  ]);

  const used = new Set(existing.map((row) => row.slug));
  const hasGeneral = new Set(existing.filter((row) => !row.serviceId).map((row) => row.templateKey));
  const hasService = new Set(existing.filter((row) => row.serviceId).map((row) => row.serviceId as string));
  const companyResponsible = owner?.name ?? "";

  const create = [];

  for (const template of POP_CATALOG) {
    if (hasGeneral.has(template.key)) continue;
    create.push({
      tenantId,
      templateKey: template.key,
      slug: uniquePopSlug(template.key, used),
      title: template.title,
      responsible: template.signer === "TECHNICAL" ? "" : companyResponsible,
      products: template.defaultProducts,
      frequency: template.defaultFrequency,
      notes: "",
    });
  }

  for (const service of services) {
    if (hasService.has(service.id)) continue;
    const template = matchServicePop(service.name);
    create.push({
      tenantId,
      serviceId: service.id,
      templateKey: template.key,
      slug: uniquePopSlug(service.name, used),
      title: `${template.code} · ${service.name}`,
      responsible: template.signer === "TECHNICAL" ? "" : companyResponsible,
      products: template.defaultProducts,
      frequency: template.defaultFrequency,
      notes: "",
    });
  }

  if (create.length) {
    await prisma.salonPop.createMany({ data: create });
  }

  return prisma.salonPop.findMany({
    where: { tenantId },
    include: { service: { select: { id: true, name: true, active: true } } },
    orderBy: [{ serviceId: "asc" }, { title: "asc" }],
  });
}
