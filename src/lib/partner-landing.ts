import { prisma } from "@/lib/db";
import { SYSTEM_BRAND_NAME } from "@/lib/branding";
import { formatPlanPrice, listPlatformPlans, parsePlanFeatures } from "@/lib/plans";
import { partnerBrandIsLive, resolveHqLanding, resolvePartnerLanding } from "@/lib/partners";

export type LandingPlanCard = {
  name: string;
  slug: string;
  description: string;
  price: string;
  trialDays: number;
  features: string[];
  highlighted: boolean;
};

export type PartnerLandingPage = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
  kicker: string;
  headline: string;
  text: string;
  cta: string;
  imageUrl: string | null;
  features: { title: string; text: string }[];
};

export async function loadPartnerLanding(slug: string, publicSurface = true): Promise<PartnerLandingPage | null> {
  if (typeof prisma.partner?.findUnique !== "function") return null;
  const partner = await prisma.partner.findUnique({
    where: { slug },
    include: { brand: true },
  });
  if (!partner?.brand || !partnerBrandIsLive(partner.status, publicSurface)) return null;
  const copy = resolvePartnerLanding(partner.brand.name, {
    kicker: partner.brand.landingKicker,
    headline: partner.brand.landingHeadline,
    text: partner.brand.landingText,
    cta: partner.brand.landingCta,
    features: partner.brand.landingFeatures,
  });
  return {
    slug: partner.slug,
    name: partner.brand.name,
    logoUrl: partner.brand.logoUrl,
    primary: partner.brand.primary,
    secondary: partner.brand.secondary,
    imageUrl: partner.brand.landingImageUrl,
    ...copy,
  };
}

export async function loadHqLanding(name = SYSTEM_BRAND_NAME): Promise<PartnerLandingPage> {
  let hq: {
    landingKicker: string;
    landingHeadline: string;
    landingText: string;
    landingCta: string;
    landingImageUrl: string | null;
    landingFeatures: string;
  } | null = null;
  try {
    if (typeof prisma.tenant?.findFirst === "function") {
      hq = await prisma.tenant.findFirst({
        where: { isPlatform: true },
        select: {
          landingKicker: true,
          landingHeadline: true,
          landingText: true,
          landingCta: true,
          landingImageUrl: true,
          landingFeatures: true,
        },
      });
    }
  } catch {
    hq = null;
  }
  const copy = resolveHqLanding(name, {
    kicker: hq?.landingKicker,
    headline: hq?.landingHeadline,
    text: hq?.landingText,
    cta: hq?.landingCta,
    features: hq?.landingFeatures,
  });
  return {
    slug: "",
    name,
    logoUrl: null,
    primary: "",
    secondary: "",
    imageUrl: hq?.landingImageUrl ?? null,
    ...copy,
  };
}

export async function loadLandingPlans(): Promise<LandingPlanCard[]> {
  try {
    if (typeof prisma.platformPlan?.findMany !== "function") return [];
    const rows = await listPlatformPlans(true);
    return rows.map((plan) => ({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price: formatPlanPrice(plan.priceCents, plan.interval),
      trialDays: plan.trialDays,
      features: parsePlanFeatures(plan.features),
      highlighted: plan.highlighted,
    }));
  } catch {
    return [];
  }
}
