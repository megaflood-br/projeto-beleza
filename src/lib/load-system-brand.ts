import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { brandFromPartner, brandTheme, SYSTEM_LOGO, SYSTEM_PRIMARY } from "@/lib/branding";
import { hostSlugFromHost, PARTNER_REF_COOKIE, sanitizePartnerSlug } from "@/lib/partners";
import { publicAppOrigin } from "@/lib/public-url";

async function hqBrand() {
  const fallback = brandTheme(SYSTEM_PRIMARY);
  if (typeof prisma.tenant?.findFirst !== "function") return fallback;
  const hq = await prisma.tenant.findFirst({
    where: { isPlatform: true },
    select: { logoUrl: true, accentColor: true },
  });
  return {
    ...brandTheme(hq?.accentColor),
    logoUrl: hq?.logoUrl || SYSTEM_LOGO,
  };
}

async function loadPartnerBrand(partnerId: string) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { brand: true },
  });
  if (!partner || partner.status !== "ACTIVE" || !partner.brand) return null;
  return brandFromPartner({
    name: partner.brand.name,
    logoUrl: partner.brand.logoUrl,
    faviconUrl: partner.brand.faviconUrl,
    primary: partner.brand.primary,
    secondary: partner.brand.secondary,
    slug: partner.slug,
  });
}

export async function loadSystemBrand() {
  try {
    const session = await getSession().catch(() => null);
    const usesSystemChrome =
      session?.role === "SUPER_ADMIN" || session?.role === "PARTNER" || session?.role === "SUPPLIER";

    if (session && !usesSystemChrome) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { kind: true, partnerId: true },
      });
      if (tenant?.kind === "SALON" && tenant.partnerId) {
        const branded = await loadPartnerBrand(tenant.partnerId);
        if (branded) return branded;
      }
    }

    if (!usesSystemChrome) {
      const jar = await cookies();
      const headerList = await headers();
      const ref = sanitizePartnerSlug(headerList.get("x-partner-ref") || jar.get(PARTNER_REF_COOKIE)?.value);
      const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
      let appHost = "";
      try {
        appHost = new URL(publicAppOrigin()).hostname;
      } catch {
        appHost = "";
      }
      const hostSlug = hostSlugFromHost(host, appHost);
      const slug = ref || hostSlug;
      if (slug) {
        const partner = await prisma.partner.findUnique({
          where: { slug },
          include: { brand: true },
        });
        if (partner?.status === "ACTIVE" && partner.brand) {
          return brandFromPartner({
            name: partner.brand.name,
            logoUrl: partner.brand.logoUrl,
            faviconUrl: partner.brand.faviconUrl,
            primary: partner.brand.primary,
            secondary: partner.brand.secondary,
            slug: partner.slug,
          });
        }
      }
      if (host && !hostSlug) {
        const byHost = await prisma.partnerBrand.findUnique({
          where: { customHost: host.split(":")[0].toLowerCase() },
          include: { partner: true },
        });
        if (byHost?.partner.status === "ACTIVE") {
          return brandFromPartner({
            name: byHost.name,
            logoUrl: byHost.logoUrl,
            faviconUrl: byHost.faviconUrl,
            primary: byHost.primary,
            secondary: byHost.secondary,
            slug: byHost.partner.slug,
          });
        }
      }
    }

    return hqBrand();
  } catch {
    return brandTheme(SYSTEM_PRIMARY);
  }
}
