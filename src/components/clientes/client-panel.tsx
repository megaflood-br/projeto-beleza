import type { ReactNode } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Clock,
  Coins,
  Hourglass,
  LayoutGrid,
  Star,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { upsertClient } from "@/app/actions/clients";
import { cn, formAction } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { calendarDate, formatMediumDate, formatTime } from "@/lib/dates";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { comandaTotal } from "@/lib/comandas";
import type { buildClientMetrics } from "@/lib/client-metrics";

const TABS = [
  { id: "cadastro", label: "Cadastro" },
  { id: "painel", label: "Painel" },
  { id: "debitos", label: "Débitos" },
  { id: "creditos", label: "Créditos" },
  { id: "cashback", label: "Cashback" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "produtos", label: "Produtos", badge: "novo" },
  { id: "vendas", label: "Vendas" },
  { id: "pacotes", label: "Pacotes" },
  { id: "mensagens", label: "Mensagens" },
  { id: "anotacoes", label: "Anotações" },
  { id: "arquivos", label: "Imagens e Arquivos" },
  { id: "anamneses", label: "Anamneses" },
  { id: "assinaturas", label: "Vendas por Assinatura" },
] as const;

export type ClientTab = (typeof TABS)[number]["id"];

export function isClientTab(value: string | undefined): value is ClientTab {
  return TABS.some((tab) => tab.id === value);
}

type AppointmentRow = {
  id: string;
  startAt: Date;
  status: string;
  professional: { name: string };
  items: { id: string; priceCents: number; service: { name: string }; professional: { name: string } | null }[];
};

type ComandaRow = {
  id: string;
  number: number;
  status: string;
  createdAt: Date;
  closedAt: Date | null;
  discountCents: number;
  professional: { name: string } | null;
  items: {
    id: string;
    type: string;
    description: string;
    quantity: number;
    priceCents: number;
    professional: { name: string } | null;
    product: { name: string } | null;
  }[];
};

export function ClientPanel({
  tab,
  client,
  metrics,
  appointments,
  comandas,
  packages,
  messages,
}: {
  tab: ClientTab;
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    instagram: string | null;
    tags: string;
    notes: string | null;
    source: string;
    birthDate: Date | null;
    creditCents: number;
    cashbackCents: number;
  };
  metrics: ReturnType<typeof buildClientMetrics>;
  appointments: AppointmentRow[];
  comandas: ComandaRow[];
  packages: { id: string; remaining: number; package: { name: string; sessions: number; priceCents: number } }[];
  messages: { id: string; direction: string; body: string; createdAt: Date }[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-200 text-violet-500">
            <UserRound size={18} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{client.name.split(" ")[0]}</h1>
        </div>
        <Link href="/clientes" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" aria-label="Fechar">
          <X size={18} />
        </Link>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-3 lg:block lg:overflow-visible lg:border-r lg:border-b-0 lg:py-4">
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <Link
                key={item.id}
                href={`/clientes/${client.id}?tab=${item.id}`}
                className={cn(
                  "flex shrink-0 items-center justify-between rounded-lg px-3 py-2 text-sm whitespace-nowrap lg:rounded-none lg:border-l-2",
                  active
                    ? "border-blue-600 bg-blue-50 font-medium text-blue-600 lg:bg-transparent"
                    : "border-transparent text-slate-600 hover:bg-sand hover:text-ink",
                )}
              >
                <span>{item.label}</span>
                {"badge" in item && item.badge ? (
                  <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <section className="min-w-0 p-5">
          {tab === "painel" ? (
            <PainelTab metrics={metrics} appointments={appointments} />
          ) : tab === "cadastro" ? (
            <CadastroTab client={client} />
          ) : tab === "debitos" ? (
            <ComandasTab
              title="Débitos"
              empty="Nenhum débito em aberto."
              rows={comandas.filter((c) => c.status === "OPEN")}
            />
          ) : tab === "creditos" ? (
            <BalanceTab label="Crédito disponível" amount={client.creditCents} empty="Sem crédito lançado." />
          ) : tab === "cashback" ? (
            <BalanceTab label="Cashback" amount={client.cashbackCents} empty="Sem cashback acumulado." />
          ) : tab === "agendamentos" ? (
            <AppointmentsTab appointments={appointments} />
          ) : tab === "produtos" ? (
            <ProductsTab comandas={comandas} />
          ) : tab === "vendas" ? (
            <ComandasTab
              title="Vendas"
              empty="Nenhuma venda fechada."
              rows={comandas.filter((c) => c.status === "CLOSED")}
            />
          ) : tab === "pacotes" ? (
            <PackagesTab packages={packages} />
          ) : tab === "mensagens" ? (
            <MessagesTab messages={messages} />
          ) : tab === "anotacoes" ? (
            <NotesTab client={client} />
          ) : tab === "arquivos" ? (
            <EmptyState text="Nenhuma imagem ou arquivo anexado." />
          ) : tab === "anamneses" ? (
            <EmptyState text="Nenhuma anamnese preenchida." />
          ) : (
            <EmptyState text="Nenhuma venda por assinatura." />
          )}
        </section>
      </div>
    </div>
  );
}

function PainelTab({
  metrics,
  appointments,
}: {
  metrics: ReturnType<typeof buildClientMetrics>;
  appointments: AppointmentRow[];
}) {
  const services = appointments.flatMap((a) =>
    a.items.map((item) => ({
      id: item.id,
      name: item.service.name,
      professional: item.professional?.name ?? a.professional.name,
      date: a.startAt,
    })),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <HeroCard
          color="bg-violet-600"
          icon={<Hourglass size={22} />}
          value={metrics.neverVisited ? "—" : String(metrics.daysWithoutVisit)}
          label={
            metrics.neverVisited
              ? "Ainda não veio"
              : `${metrics.daysWithoutVisit} dia${metrics.daysWithoutVisit === 1 ? "" : "s"} sem vir`
          }
        />
        <HeroCard color="bg-blue-600" icon={<Star size={22} />} value="—" label="Última avaliação" />
        <HeroCard
          color="bg-emerald-600"
          icon={<CircleDollarSign size={22} />}
          value={formatBRL(metrics.revenueCents)}
          label="Faturamento"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Wallet size={18} />} value={formatBRL(metrics.debitCents)} label="Débitos" />
        <StatCard icon={<LayoutGrid size={18} />} value={String(metrics.openPackages)} label="Pacotes em aberto" />
        <StatCard icon={<CircleDollarSign size={18} />} value={formatBRL(metrics.creditCents)} label="Crédito" />
        <StatCard icon={<Coins size={18} />} value={formatBRL(metrics.cashbackCents)} label="Cashback" />
        <StatCard
          icon={<TrendingDown size={18} />}
          value={`${metrics.cancelRate.toFixed(1)}%`}
          label="Taxa de cancelamento"
        />
        <StatCard icon={<Clock size={18} />} value={`${metrics.clientDays} dias`} label="Tempo como cliente" />
        <StatCard
          icon={<TrendingUp size={18} />}
          value={metrics.returnDays == null ? "—" : `${metrics.returnDays} dias`}
          label="Taxa de retorno"
        />
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold">Últimos serviços</h2>
        {services.length === 0 ? (
          <EmptyState text="Nenhum serviço registrado." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-ink-soft">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="font-medium">Profissional</th>
                  <th className="px-4 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {services.slice(0, 8).map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-2.5">{row.name}</td>
                    <td>{row.professional}</td>
                    <td className="px-4 text-ink-soft">{formatMediumDate(row.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroCard({
  color,
  icon,
  value,
  label,
}: {
  color: string;
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-white", color)}>
      <div className="opacity-90">{icon}</div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="mt-1 text-sm text-white/85">{label}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <div className="truncate font-semibold">{value}</div>
        <div className="text-xs text-ink-soft">{label}</div>
      </div>
    </div>
  );
}

function CadastroTab({
  client,
}: {
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    instagram: string | null;
    tags: string;
    notes: string | null;
    source: string;
    birthDate: Date | null;
  };
}) {
  return (
    <form action={formAction(upsertClient)} className="grid max-w-xl gap-3">
      <input type="hidden" name="id" value={client.id} />
      <Field label="Nome">
        <Input name="name" defaultValue={client.name} required />
      </Field>
      <Field label="WhatsApp">
        <Input name="phone" defaultValue={client.phone} required />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" defaultValue={client.email ?? ""} />
      </Field>
      <Field label="Instagram">
        <Input name="instagram" defaultValue={client.instagram ?? ""} />
      </Field>
      <Field label="Nascimento">
        <Input name="birthDate" type="date" defaultValue={client.birthDate ? calendarDate(client.birthDate) : ""} />
      </Field>
      <Field label="Tags">
        <Input name="tags" defaultValue={client.tags} />
      </Field>
      <Field label="Origem">
        <Input defaultValue={client.source} disabled />
      </Field>
      <Field label="Notas">
        <Textarea name="notes" defaultValue={client.notes ?? ""} />
      </Field>
      <div>
        <Button>Salvar cadastro</Button>
      </div>
    </form>
  );
}

function NotesTab({
  client,
}: {
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    instagram: string | null;
    tags: string;
    notes: string | null;
    birthDate: Date | null;
  };
}) {
  return (
    <form action={formAction(upsertClient)} className="grid max-w-xl gap-3">
      <input type="hidden" name="id" value={client.id} />
      <input type="hidden" name="name" value={client.name} />
      <input type="hidden" name="phone" value={client.phone} />
      <input type="hidden" name="email" value={client.email ?? ""} />
      <input type="hidden" name="instagram" value={client.instagram ?? ""} />
      <input type="hidden" name="tags" value={client.tags} />
      {client.birthDate ? <input type="hidden" name="birthDate" value={calendarDate(client.birthDate)} /> : null}
      <Field label="Anotações">
        <Textarea name="notes" defaultValue={client.notes ?? ""} className="min-h-40" />
      </Field>
      <Button>Salvar anotações</Button>
    </form>
  );
}

function AppointmentsTab({ appointments }: { appointments: AppointmentRow[] }) {
  if (!appointments.length) return <EmptyState text="Nenhum agendamento." />;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-ink-soft">
          <tr>
            <th className="px-4 py-2.5 font-medium">Quando</th>
            <th className="font-medium">Serviço</th>
            <th className="font-medium">Profissional</th>
            <th className="px-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className="px-4 py-2.5">
                {formatMediumDate(a.startAt)} · {formatTime(a.startAt)}
              </td>
              <td>{a.items.map((i) => i.service.name).join(", ") || "—"}</td>
              <td>{a.professional.name}</td>
              <td className="px-4">{STATUS_LABEL[a.status as AppointmentStatus] ?? a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComandasTab({ title, empty, rows }: { title: string; empty: string; rows: ComandaRow[] }) {
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-soft">
            <tr>
              <th className="px-4 py-2.5 font-medium">Comanda</th>
              <th className="font-medium">Itens</th>
              <th className="px-4 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-4 py-2.5">
                  <Link href={`/comandas/${c.id}`} className="font-medium text-wine">
                    #{c.number}
                  </Link>
                  <div className="text-xs text-ink-soft">{formatMediumDate(c.closedAt ?? c.createdAt)}</div>
                </td>
                <td>{c.items.map((i) => i.description).join(", ")}</td>
                <td className="px-4">{formatBRL(comandaTotal(c))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTab({ comandas }: { comandas: ComandaRow[] }) {
  const products = comandas.flatMap((c) =>
    c.items
      .filter((i) => i.type === "PRODUCT")
      .map((i) => ({
        id: i.id,
        name: i.product?.name ?? i.description,
        qty: i.quantity,
        date: c.closedAt ?? c.createdAt,
        total: Math.round(i.quantity * i.priceCents),
      })),
  );
  if (!products.length) return <EmptyState text="Nenhum produto vendido para este cliente." />;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-ink-soft">
          <tr>
            <th className="px-4 py-2.5 font-medium">Produto</th>
            <th className="font-medium">Qtd</th>
            <th className="font-medium">Valor</th>
            <th className="px-4 font-medium">Data</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="px-4 py-2.5">{p.name}</td>
              <td>{p.qty}</td>
              <td>{formatBRL(p.total)}</td>
              <td className="px-4">{formatMediumDate(p.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackagesTab({
  packages,
}: {
  packages: { id: string; remaining: number; package: { name: string; sessions: number; priceCents: number } }[];
}) {
  if (!packages.length) return <EmptyState text="Nenhum pacote vinculado." />;
  return (
    <div className="grid gap-3">
      {packages.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <div>
            <div className="font-medium">{p.package.name}</div>
            <div className="text-sm text-ink-soft">
              {p.remaining} de {p.package.sessions} sessões
            </div>
          </div>
          <div className="font-semibold">{formatBRL(p.package.priceCents)}</div>
        </div>
      ))}
    </div>
  );
}

function MessagesTab({ messages }: { messages: { id: string; direction: string; body: string; createdAt: Date }[] }) {
  if (!messages.length) return <EmptyState text="Nenhuma mensagem com este cliente." />;
  return (
    <div className="space-y-2">
      {messages.map((m) => (
        <div key={m.id} className={cn("max-w-xl rounded-xl px-3 py-2 text-sm", m.direction === "OUT" ? "ml-auto bg-blue-50" : "bg-slate-50")}>
          <div>{m.body}</div>
          <div className="mt-1 text-[11px] text-ink-soft">
            {formatMediumDate(m.createdAt)} · {formatTime(m.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BalanceTab({ label, amount, empty }: { label: string; amount: number; empty: string }) {
  if (!amount) return <EmptyState text={empty} />;
  return (
    <div className="rounded-xl border border-line px-5 py-6">
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{formatBRL(amount)}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-ink-soft">{text}</p>;
}
