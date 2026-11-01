import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { saveInboxClient } from "@/app/actions/clients";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { formatMediumDate } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { formAction, formatPhoneBR, initials } from "@/lib/utils";

export type InboxClientProfile = {
  conversationId: string;
  phone: string;
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    instagram: string | null;
    tags: string;
    notes: string | null;
    imageUrl: string | null;
    creditCents: number;
    cashbackCents: number;
  } | null;
  appointments: { id: string; startAt: Date; status: string; service: string }[];
  sales: { id: string; number: number; createdAt: Date; status: string; totalCents: number }[];
};

function statusLabel(status: string) {
  return STATUS_LABEL[status as AppointmentStatus] ?? status;
}

export function InboxClientPanel({ profile }: { profile: InboxClientProfile | null }) {
  if (!profile) {
    return (
      <div className="flex h-full min-h-48 flex-col items-center justify-center px-5 py-8 text-center text-sm text-ink-soft">
        <UserRound size={28} className="mb-3 text-slate-400" />
        Selecione uma conversa para ver o perfil da cliente.
      </div>
    );
  }

  const client = profile.client;

  return (
    <div className="space-y-5 p-5">
      {client ? (
        <>
          <div className="flex items-start gap-3">
            {client.imageUrl ? (
              <img src={client.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-wine">
                {initials(client.name)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl">{client.name}</h2>
              <p className="text-sm text-ink-soft">{formatPhoneBR(client.phone || profile.phone)}</p>
              {client.email ? <p className="truncate text-sm text-ink-soft">{client.email}</p> : null}
              {client.instagram ? <p className="truncate text-sm text-ink-soft">{client.instagram}</p> : null}
            </div>
          </div>

          {client.tags ? (
            <div className="flex flex-wrap gap-1">
              {client.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} className="rounded-full bg-sand px-2 py-0.5 text-xs text-ink-soft">
                    {tag}
                  </span>
                ))}
            </div>
          ) : null}

          {client.notes ? <p className="text-sm leading-6 text-ink-soft">{client.notes}</p> : null}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-sand px-3 py-2">
              <div className="text-xs text-ink-soft">Crédito</div>
              <div className="font-medium">{formatBRL(client.creditCents)}</div>
            </div>
            <div className="rounded-xl bg-sand px-3 py-2">
              <div className="text-xs text-ink-soft">Cashback</div>
              <div className="font-medium">{formatBRL(client.cashbackCents)}</div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">Últimos horários</h3>
            {profile.appointments.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {profile.appointments.map((row) => (
                  <li key={row.id}>
                    <div className="font-medium">{row.service}</div>
                    <div className="text-xs text-ink-soft">
                      {formatMediumDate(row.startAt)} · {statusLabel(row.status)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nenhum agendamento ainda.</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">Últimas vendas</h3>
            {profile.sales.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {profile.sales.map((row) => (
                  <li key={row.id} className="flex items-baseline justify-between gap-2">
                    <span>
                      #{row.number} · {formatMediumDate(row.createdAt)}
                    </span>
                    <span className="font-medium">{formatBRL(row.totalCents)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nenhuma comanda ainda.</p>
            )}
          </div>

          <Link href={`/clientes/${client.id}`} className="inline-flex text-sm font-medium text-wine">
            Abrir ficha completa
          </Link>
        </>
      ) : (
        <form action={formAction(saveInboxClient)} className="grid gap-3">
          <div>
            <h2 className="font-display text-xl">Cliente não cadastrada</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Este número ainda não tem ficha. Salve o nome para atender com histórico.
            </p>
            <p className="mt-2 text-sm font-medium">{formatPhoneBR(profile.phone)}</p>
          </div>
          <input type="hidden" name="conversationId" value={profile.conversationId} />
          <Field label="Nome">
            <Input name="name" required placeholder="Nome da cliente" />
          </Field>
          <Field label="E-mail">
            <Input name="email" type="email" />
          </Field>
          <Field label="Anotações">
            <Textarea name="notes" rows={3} />
          </Field>
          <Button>Salvar cliente</Button>
        </form>
      )}
    </div>
  );
}
