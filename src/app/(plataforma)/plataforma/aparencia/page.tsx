import { requirePlatformAdmin } from "@/lib/tenant";
import { AppearanceBoard } from "@/components/plataforma/appearance-board";
import { PlatformLandingBoard } from "@/components/plataforma/platform-landing-board";
import { loadSystemBrand } from "@/lib/load-system-brand";
import { defaultHqLanding, parseLandingFeatures, resolveHqLanding } from "@/lib/partners";

export default async function PlataformaAparenciaPage() {
  const { tenant } = await requirePlatformAdmin();
  const brand = await loadSystemBrand();
  const defaults = defaultHqLanding(brand.name);
  const copy = resolveHqLanding(brand.name, {
    kicker: tenant.landingKicker,
    headline: tenant.landingHeadline,
    text: tenant.landingText,
    cta: tenant.landingCta,
    features: tenant.landingFeatures,
  });
  const savedFeatures = parseLandingFeatures(tenant.landingFeatures);

  return (
    <div className="space-y-10">
      <AppearanceBoard
        logoUrl={brand.logoUrl}
        logoDarkUrl={brand.logoDarkUrl || ""}
        faviconUrl={brand.faviconUrl || ""}
        primary={brand.primary}
      />
      <PlatformLandingBoard
        kicker={tenant.landingKicker || copy.kicker}
        headline={tenant.landingHeadline || copy.headline}
        text={tenant.landingText || copy.text}
        cta={tenant.landingCta || copy.cta}
        imageUrl={tenant.landingImageUrl || ""}
        features={savedFeatures.length ? savedFeatures : defaults.features}
      />
    </div>
  );
}
