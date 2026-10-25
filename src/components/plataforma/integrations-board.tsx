import Link from "next/link";
import { Button, Card, Field, Input } from "@/components/ui";
import { saveContoraIntegration, saveEvolutionIntegration, saveOpenAiIntegration } from "@/app/actions/platform-integrations";
import { cn, formAction } from "@/lib/utils";
import { INTEGRATION_TABS, type IntegrationTab } from "@/lib/integrations";

export type PlatformIntegrationValue = {
  openaiMasked: string;
  contoraMasked: string;
  evolutionUrl: string | null;
  evolutionMasked: string;
  publicAppUrl: string | null;
  hasOpenAi: boolean;
  hasContora: boolean;
  hasEvolution: boolean;
};

export function IntegrationsBoard({
  tab,
  value,
}: {
  tab: IntegrationTab;
  value: PlatformIntegrationValue;
}) {
  const current = INTEGRATION_TABS.find((item) => item.id === tab) ?? INTEGRATION_TABS[0];

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Integrações</h1>
        <p className="mt-1 text-sm text-ink-soft">{current.description}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {INTEGRATION_TABS.map((item) => {
          const active = item.id === tab;
          const configured =
            (item.id === "openai" && value.hasOpenAi) ||
            (item.id === "contora" && value.hasContora) ||
            (item.id === "evolution" && value.hasEvolution);
          return (
            <Link
              key={item.id}
              href={`/plataforma/integracoes?tab=${item.id}`}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm",
                active ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
              {configured ? (
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">ativo</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {tab === "contora" ? (
        <ContoraForm masked={value.contoraMasked} />
      ) : tab === "evolution" ? (
        <EvolutionForm
          evolutionUrl={value.evolutionUrl}
          evolutionMasked={value.evolutionMasked}
          publicAppUrl={value.publicAppUrl}
        />
      ) : (
        <OpenAiForm masked={value.openaiMasked} />
      )}
    </div>
  );
}

function OpenAiForm({ masked }: { masked: string }) {
  return (
    <Card>
      <form action={formAction(saveOpenAiIntegration)} className="grid gap-3">
        <Field label="Chave da API">
          <Input name="openaiApiKey" type="password" placeholder={masked || "sk-..."} />
        </Field>
        <p className="text-xs text-ink-soft">Usada pelo assistente de todos os salões. Os salões não veem esta chave.</p>
        <Button>Salvar OpenAI</Button>
      </form>
    </Card>
  );
}

function ContoraForm({ masked }: { masked: string }) {
  return (
    <Card>
      <form action={formAction(saveContoraIntegration)} className="grid gap-3">
        <Field label="Token da API">
          <Input name="contoraApiToken" type="password" placeholder={masked || "fct_..."} />
        </Field>
        <p className="text-xs text-ink-soft">
          Uma chave da software house cobre os CNPJs. Cadastre em{" "}
          <a href="https://fiscal.contora.com.br/register" className="text-wine" target="_blank" rel="noreferrer">
            fiscal.contora.com.br
          </a>
          . Cada salão sobe o A1 em Configurações → Fiscal.
        </p>
        <Button>Salvar Contora</Button>
      </form>
    </Card>
  );
}

function EvolutionForm({
  evolutionUrl,
  evolutionMasked,
  publicAppUrl,
}: {
  evolutionUrl: string | null;
  evolutionMasked: string;
  publicAppUrl: string | null;
}) {
  return (
    <Card>
      <form action={formAction(saveEvolutionIntegration)} className="grid gap-3">
        <Field label="URL do servidor">
          <Input name="evolutionUrl" defaultValue={evolutionUrl ?? ""} placeholder="https://evo.seudominio.com" />
        </Field>
        <Field label="API key global">
          <Input name="evolutionApiKey" type="password" placeholder={evolutionMasked || "chave da Evolution"} />
        </Field>
        <Field label="URL pública do MegaBeauty (webhook)">
          <Input name="publicAppUrl" defaultValue={publicAppUrl ?? ""} placeholder="https://app.megabeauty.com.br" />
        </Field>
        <p className="text-xs text-ink-soft">Os salões não veem estas chaves. Em WhatsApp, cada um gera o QR da própria instância.</p>
        <Button>Salvar WhatsApp</Button>
      </form>
    </Card>
  );
}
