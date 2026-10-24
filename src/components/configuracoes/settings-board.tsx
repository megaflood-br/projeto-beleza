import Link from "next/link";
import { Button, Card, Field, Input } from "@/components/ui";
import { saveCashbackSettings, saveSettings } from "@/app/actions/settings";
import { cn, formAction } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings";
import type { CashbackConfig } from "@/lib/cashback";

export type SalonSettingsValue = {
  name: string;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  openTime: string;
  closeTime: string;
  reminderHours: number;
  slug: string;
};

export function SettingsBoard({
  tab,
  salon,
  cashback,
}: {
  tab: SettingsTab;
  salon: SalonSettingsValue;
  cashback: CashbackConfig;
}) {
  const current = SETTINGS_TABS.find((item) => item.id === tab) ?? SETTINGS_TABS[0];

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-ink-soft">{current.description}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {SETTINGS_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={`/configuracoes?tab=${item.id}`}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm",
                active ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
              {item.id === "cashback" && cashback.enabled ? (
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">ativo</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {tab === "cashback" ? <CashbackForm cashback={cashback} /> : <SalonForm salon={salon} />}
    </div>
  );
}

function SalonForm({ salon }: { salon: SalonSettingsValue }) {
  return (
    <Card>
      <form action={formAction(saveSettings)} className="grid gap-3">
        <Field label="Nome">
          <Input name="name" defaultValue={salon.name} />
        </Field>
        <Field label="Nome fantasia">
          <Input name="tradeName" defaultValue={salon.tradeName ?? ""} />
        </Field>
        <Field label="Telefone">
          <Input name="phone" defaultValue={salon.phone ?? ""} />
        </Field>
        <Field label="E-mail">
          <Input name="email" defaultValue={salon.email ?? ""} />
        </Field>
        <Field label="Endereço">
          <Input name="address" defaultValue={salon.address ?? ""} />
        </Field>
        <Field label="Cidade">
          <Input name="city" defaultValue={salon.city ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abre">
            <Input name="openTime" type="time" defaultValue={salon.openTime} />
          </Field>
          <Field label="Fecha">
            <Input name="closeTime" type="time" defaultValue={salon.closeTime} />
          </Field>
        </div>
        <Field label="Lembrete (horas antes)">
          <Input name="reminderHours" type="number" defaultValue={salon.reminderHours} />
        </Field>
        <p className="text-xs text-ink-soft">
          Link de agendamento online: <code>/agendar/{salon.slug}</code>
        </p>
        <Button>Salvar salão</Button>
      </form>
    </Card>
  );
}

function CashbackForm({ cashback }: { cashback: CashbackConfig }) {
  return (
    <Card>
      <form action={formAction(saveCashbackSettings)} className="grid gap-3">
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
  );
}
