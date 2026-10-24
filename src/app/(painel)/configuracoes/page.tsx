import { requireTenant } from "@/lib/tenant";
import { Button, Card, Field, Input } from "@/components/ui";
import { saveCashbackSettings, saveSettings } from "@/app/actions/settings";
import { formAction } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { tenantCashbackConfig } from "@/lib/cashback";

export default async function ConfigPage() {
  const { tenant } = await requireTenant();
  const cashback = tenantCashbackConfig(tenant);
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-3xl">Configurações do salão</h1>
      <Card>
        <form action={formAction(saveSettings)} className="grid gap-3">
          <Field label="Nome">
            <Input name="name" defaultValue={tenant.name} />
          </Field>
          <Field label="Nome fantasia">
            <Input name="tradeName" defaultValue={tenant.tradeName ?? ""} />
          </Field>
          <Field label="Telefone">
            <Input name="phone" defaultValue={tenant.phone ?? ""} />
          </Field>
          <Field label="E-mail">
            <Input name="email" defaultValue={tenant.email ?? ""} />
          </Field>
          <Field label="Endereço">
            <Input name="address" defaultValue={tenant.address ?? ""} />
          </Field>
          <Field label="Cidade">
            <Input name="city" defaultValue={tenant.city ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Abre">
              <Input name="openTime" type="time" defaultValue={tenant.openTime} />
            </Field>
            <Field label="Fecha">
              <Input name="closeTime" type="time" defaultValue={tenant.closeTime} />
            </Field>
          </div>
          <Field label="Lembrete (horas antes)">
            <Input name="reminderHours" type="number" defaultValue={tenant.reminderHours} />
          </Field>
          <Field label="Chave OpenAI (por salão)">
            <Input name="openaiApiKey" type="password" defaultValue={tenant.openaiApiKey ?? ""} />
          </Field>
          <p className="text-xs text-ink-soft">
            Link de agendamento online: <code>/agendar/{tenant.slug}</code>
          </p>
          <Button>Salvar</Button>
        </form>
      </Card>

      <Card>
        <form action={formAction(saveCashbackSettings)} className="grid gap-3">
          <div>
            <h2 className="font-display text-2xl">Cashback</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Ative o módulo e defina como os pontos são gerados e usados nas comandas.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
            <input type="checkbox" name="cashbackEnabled" value="1" defaultChecked={cashback.enabled} />
            Ativar módulo de cashback
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Percentual padrão">
              <Input name="cashbackEarnPct" type="number" min={0} max={100} defaultValue={cashback.earnPct} />
            </Field>
            <Field label="Uso máximo na comanda (%)">
              <Input name="cashbackMaxRedeemPct" type="number" min={0} max={100} defaultValue={cashback.maxRedeemPct} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor de 1 ponto">
              <Input name="cashbackPointValue" defaultValue={formatBRL(cashback.centsPerPoint)} />
            </Field>
            <Field label="Gasto mínimo para acumular">
              <Input name="cashbackMinSpend" defaultValue={formatBRL(cashback.minSpendCents)} />
            </Field>
          </div>
          <Field label="Validade dos pontos (dias, 0 = sem validade)">
            <Input name="cashbackExpireDays" type="number" min={0} defaultValue={cashback.expireDays} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cashbackUseItemPct" value="1" defaultChecked={cashback.useItemPct} />
            Usar percentual do serviço ou produto quando estiver cadastrado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cashbackOnServices" value="1" defaultChecked={cashback.onServices} />
            Acumular em serviços
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cashbackOnProducts" value="1" defaultChecked={cashback.onProducts} />
            Acumular em produtos
          </label>
          <p className="text-xs text-ink-soft">
            Ao fechar a comanda, o cliente acumula o percentual sobre os itens elegíveis e pode resgatar até o limite
            configurado. Lançamentos manuais ficam na aba Cashback do cliente.
          </p>
          <Button>Salvar cashback</Button>
        </form>
      </Card>
    </div>
  );
}
