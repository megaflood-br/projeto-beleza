import { prisma } from "@/lib/db";
import { partnerBrandIsLive, resolvePartnerLanding } from "@/lib/partners";

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
