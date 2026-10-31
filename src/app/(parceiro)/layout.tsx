import { requirePartner } from "@/lib/tenant";
import { PartnerShell } from "@/components/parceiro/partner-shell";

export default async function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const { session, partner } = await requirePartner();
  return (
    <PartnerShell
      brandName={partner.brand?.name || partner.slug}
      userName={session.name}
      impersonatorName={session.impersonatorName}
    >
      {children}
    </PartnerShell>
  );
}
