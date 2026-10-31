import { requirePartner } from "@/lib/tenant";
import { partnerAffiliateUrl, partnerSubdomainUrl } from "@/lib/partners";
import { publicAppOrigin } from "@/lib/public-url";
import { Card } from "@/components/ui";
import { CopyLink } from "@/components/parceiro/copy-link";

export default async function ParceiroLinksPage() {
  const { partner } = await requirePartner();
  const origin = publicAppOrigin();
  const link = partnerAffiliateUrl(partner.slug, origin);
  const subdomain = partner.brand?.customHost
    ? `https://${partner.brand.customHost}`
    : partnerSubdomainUrl(partner.slug, origin);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Meus links</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Quem assinar por estes endereços vê o CRM com a sua marca e gera comissão vitalícia para você.
        </p>
      </div>
      <Card>
        <div className="text-xs font-medium tracking-wide text-ink-soft uppercase">Link de indicação</div>
        <div className="mt-2 break-all font-mono text-sm">{link}</div>
        <div className="mt-3">
          <CopyLink value={link} />
        </div>
      </Card>
      {subdomain ? (
        <Card>
          <div className="text-xs font-medium tracking-wide text-ink-soft uppercase">Subdomínio</div>
          <div className="mt-2 break-all font-mono text-sm">{subdomain}</div>
          <p className="mt-2 text-xs text-ink-soft">Depende do DNS *.beauty.megaflood.cloud estar apontado para o app.</p>
          <div className="mt-3">
            <CopyLink value={subdomain} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
