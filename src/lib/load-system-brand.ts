import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { brandFromPartner, brandTheme, SYSTEM_LOGO, SYSTEM_LOGO_DARK, SYSTEM_PRIMARY } from "@/lib/branding";
import {
  hostSlugFromHost,
  isPublicBrandPath,
  partnerBrandIsLive,
  partnerHostCandidates,
  partnerRefForBrand,
  PARTNER_REF_COOKIE,
  shouldApplyPartnerBrand,
} from "@/lib/partners";
import { publicAppOrigin } from "@/lib/public-url";

async function hqBrand() {
  const fallback = brandTheme(SYSTEM_PRIMARY);
  if (typeof prisma.tenant?.findFirst !== "function") return fallback;
  const hq = await prisma.tenant.findFirst({
    where: { isPlatform: true },
    select: { logoUrl: true, logoDarkUrl: true, faviconUrl: true, accentColor: true },
  });
  return {
    ...brandTheme(hq?.accentColor),
    logoUrl: hq?.logoUrl || SYSTEM_LOGO,
    logoDarkUrl: hq?.logoDarkUrl || SYSTEM_LOGO_DARK,
    faviconUrl: hq?.faviconUrl || null,
  };
}

function brandOf(partner: {
  slug: string;
  status: string;
  brand: {
    name: string;
    logoUrl: string | null;
    logoDarkUrl?: string | null;
    faviconUrl: string | null;
    primary: string;
    secondary: string;
  } | null;
}) {
  if (!partner.brand) return null;
  return brandFromPartner({
    name: partner.brand.name,
    logoUrl: partner.brand.logoUrl,
    logoDarkUrl: partner.brand.logoDarkUrl,
    faviconUrl: partner.brand.faviconUrl,
    primary: partner.brand.primary,
    secondary: partner.brand.secondary,
    slug: partner.slug,
  });
}

async function loadPartnerBrandBySlug(slug: string, publicSurface = false) {
  const partner = await prisma.partner.findUnique({
    where: { slug },
    include: { brand: true },
  });
  if (!partner || !partnerBrandIsLive(partner.status, publicSurface)) return null;
  return brandOf(partner);
}

export async function loadSystemBrand() {
  try {
    const session = await getSession().catch(() => null);
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") || "";
    const publicSurface = isPublicBrandPath(pathname);
    if (!shouldApplyPartnerBrand({ pathname, hasSession: Boolean(session) })) {
      return await hqBrand();
    }

    const jar = await cookies();
    const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
    let appHost = "";
    try {
      appHost = new URL(publicAppOrigin()).hostname;
    } catch {
      appHost = "";
    }
    const hostSlug = hostSlugFromHost(host, appHost);
    const slug = partnerRefForBrand({
      pathname,
      headerRef: headerList.get("x-partner-ref"),
      cookieRef: jar.get(PARTNER_REF_COOKIE)?.value,
      hostSlug,
    });
    if (slug) {
      const branded = await loadPartnerBrandBySlug(slug, publicSurface);
      if (branded) return branded;
    }
    const hostCandidates = partnerHostCandidates(host);
    if (hostCandidates.length) {
      const byHost = await prisma.partnerBrand.findFirst({
        where: { customHost: { in: hostCandidates } },
        include: { partner: true },
      });
      if (byHost && partnerBrandIsLive(byHost.partner.status, publicSurface)) {
        return brandFromPartner({
          name: byHost.name,
          logoUrl: byHost.logoUrl,
          logoDarkUrl: byHost.logoDarkUrl,
          faviconUrl: byHost.faviconUrl,
          primary: byHost.primary,
          secondary: byHost.secondary,
          slug: byHost.partner.slug,
        });
      }
    }

    return await hqBrand();
  } catch {
    return brandTheme(SYSTEM_PRIMARY);
  }
}
