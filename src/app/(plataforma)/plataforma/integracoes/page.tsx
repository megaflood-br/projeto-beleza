import { requirePlatformAdmin } from "@/lib/tenant";
import { Button, Card, Field, Input } from "@/components/ui";
import { savePlatformIntegrations } from "@/app/actions/platform-integrations";
import { formAction } from "@/lib/utils";
import { maskSecret } from "@/lib/integrations";

export default async function PlataformaIntegracoesPage() {
  const { tenant } = await requirePlatformAdmin();
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Integrações</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Chave OpenAI e servidor Evolution são universais. Cada salão só vincula o próprio WhatsApp pelo QR Code.
        </p>
      </div>
      <Card>
        <form action={formAction(savePlatformIntegrations)} className="grid gap-3">
          <h2 className="font-medium">OpenAI</h2>
          <Field label="Chave da API (usada por todos os salões)">
            <Input
              name="openaiApiKey"
              type="password"
              placeholder={tenant.openaiApiKey ? maskSecret(tenant.openaiApiKey) : "sk-..."}
            />
          </Field>
          <h2 className="mt-2 font-medium">Evolution API</h2>
          <Field label="URL do servidor">
            <Input name="evolutionUrl" defaultValue={tenant.evolutionUrl ?? ""} placeholder="https://evo.seudominio.com" />
          </Field>
          <Field label="API key global">
            <Input
              name="evolutionApiKey"
              type="password"
              placeholder={tenant.evolutionApiKey ? maskSecret(tenant.evolutionApiKey) : "chave da Evolution"}
            />
          </Field>
          <Field label="URL pública do MegaBeauty (webhook)">
            <Input name="publicAppUrl" defaultValue={tenant.publicAppUrl ?? ""} placeholder="https://app.megabeauty.com.br" />
          </Field>
          <p className="text-xs text-ink-soft">
            Os salões não veem estas chaves. Em WhatsApp, cada um gera o QR da própria instância.
          </p>
          <Button>Salvar integrações</Button>
        </form>
      </Card>
    </div>
  );
}
