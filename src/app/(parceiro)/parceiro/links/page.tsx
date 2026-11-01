import { requirePartner } from "@/lib/tenant";
import { partnerAffiliateUrl, partnerCustomUrl, partnerLandingUrl, partnerSubdomainUrl } from "@/lib/partners";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { publicAppOrigin } from "@/lib/public-url";
import { Card } from "@/components/ui";
import { CopyLink } from "@/components/parceiro/copy-link";

export default async function ParceiroLinksPage() {
  const { partner } = await requirePartner();
  const integrations = await resolvePlatformIntegrations();
  const origin = publicAppOrigin(integrations.publicAppUrl);
  const landing = partnerLandingUrl(partner.slug, origin);
  const link = partnerAffiliateUrl(partner.slug, origin);
  const custom = partnerCustomUrl(partner.brand?.customHost);
  const subdomain = partnerSubdomainUrl(partner.slug, origin);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Meus links</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Quem assinar por estes endereços vê o CRM com a sua marca e gera comissão vitalícia para você.
        </p>
      </div>
      <Card>
        <div className="text-xs font-medium tracking-wide text-ink-soft uppercase">Landing page</div>
        <div className="mt-2 break-all font-mono text-sm">{landing}</div>
        <p className="mt-2 text-xs text-ink-soft">Página com a sua marca. Edite em Landing page.</p>
        <div className="mt-3">
          <CopyLink value={landing} />
        </div>
      </Card>
      {custom ? (
        <Card>
          <div className="text-xs font-medium tracking-wide text-ink-soft uppercase">Domínio próprio</div>
          <div className="mt-2 break-all font-mono text-sm">{custom}</div>
          <p className="mt-2 text-xs text-ink-soft">
            Aponte um CNAME de {partner.brand?.customHost} para beauty.megaflood.cloud. Sem ?ref= — o host já identifica você.
          </p>
          <div className="mt-3">
            <CopyLink value={`${custom}/cadastro`} />
          </div>
        </Card>
      ) : null}
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
