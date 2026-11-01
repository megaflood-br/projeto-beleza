import { notFound } from "next/navigation";
import { PartnerLandingView } from "@/components/parceiro/partner-landing-view";
import { loadLandingPlans, loadPartnerLanding } from "@/lib/partner-landing";
import { sanitizePartnerSlug } from "@/lib/partners";

export default async function PartnerPublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = sanitizePartnerSlug((await params).slug);
  const landing = slug ? await loadPartnerLanding(slug) : null;
  if (!landing) notFound();
  return <PartnerLandingView landing={landing} plans={await loadLandingPlans()} />;
}
