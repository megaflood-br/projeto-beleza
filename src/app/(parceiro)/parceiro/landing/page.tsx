import { requirePartner } from "@/lib/tenant";
import { PartnerLandingBoard } from "@/components/parceiro/partner-landing-board";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { defaultPartnerLanding, parseLandingFeatures, partnerLandingUrl, resolvePartnerLanding } from "@/lib/partners";
import { publicAppOrigin } from "@/lib/public-url";

export default async function ParceiroLandingPage() {
  const { partner } = await requirePartner();
  const integrations = await resolvePlatformIntegrations();
  const name = partner.brand?.name || partner.slug;
  const defaults = defaultPartnerLanding(name);
  const copy = resolvePartnerLanding(name, {
    kicker: partner.brand?.landingKicker,
    headline: partner.brand?.landingHeadline,
    text: partner.brand?.landingText,
    cta: partner.brand?.landingCta,
    features: partner.brand?.landingFeatures,
  });
  const savedFeatures = parseLandingFeatures(partner.brand?.landingFeatures);

  return (
    <PartnerLandingBoard
      slug={partner.slug}
      kicker={partner.brand?.landingKicker || copy.kicker}
      headline={partner.brand?.landingHeadline || copy.headline}
      text={partner.brand?.landingText || copy.text}
      cta={partner.brand?.landingCta || copy.cta}
      imageUrl={partner.brand?.landingImageUrl || ""}
      features={savedFeatures.length ? savedFeatures : defaults.features}
      previewUrl={partnerLandingUrl(partner.slug, publicAppOrigin(integrations.publicAppUrl))}
    />
  );
}
