import { requirePartner } from "@/lib/tenant";
import { PartnerAppearanceBoard } from "@/components/parceiro/partner-appearance-board";
import { SYSTEM_PRIMARY } from "@/lib/branding";

export default async function ParceiroAparenciaPage() {
  const { partner } = await requirePartner();
  return (
    <PartnerAppearanceBoard
      name={partner.brand?.name || partner.slug}
      logoUrl={partner.brand?.logoUrl || ""}
      faviconUrl={partner.brand?.faviconUrl || ""}
      primary={partner.brand?.primary || SYSTEM_PRIMARY}
      secondary={partner.brand?.secondary || "#0f172a"}
    />
  );
}
