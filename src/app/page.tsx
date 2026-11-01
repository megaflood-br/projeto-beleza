import { PartnerLandingView } from "@/components/parceiro/partner-landing-view";
import { loadHqLanding, loadPartnerLanding } from "@/lib/partner-landing";
import { loadSystemBrand } from "@/lib/load-system-brand";

export default async function HomePage() {
  const brand = await loadSystemBrand();
  if (brand.partnerSlug) {
    const landing = await loadPartnerLanding(brand.partnerSlug);
    if (landing) return <PartnerLandingView landing={landing} />;
  }
  return <PartnerLandingView landing={await loadHqLanding(brand.name)} />;
}
