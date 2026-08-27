"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CirclePlay, Plus } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { ComandaDrawer } from "@/components/comandas/comanda-drawer";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { COMANDA_STATUS_COLOR, COMANDA_STATUS_LABEL, PAYMENT_LABEL, type ComandaStatus } from "@/lib/constants";
import type { ComandaFormValue, PaymentMethodOption } from "@/components/comandas/types";

export function ComandaBoard({
  comandas,
  nextNumber,
  clients,
  professionals,
  services,
  products,
  paymentMethods = [],
}: {
  comandas: ComandaFormValue[];
  nextNumber: number;
  clients: { id: string; name: string; phone: string; creditCents: number; cashbackCents: number }[];
  professionals: { id: string; name: string }[];
  services: { id: string; name: string; priceCents: number }[];
  products: { id: string; name: string; priceCents: number }[];
  paymentMethods?: PaymentMethodOption[];
}) {
  const [editing, setEditing] = useState<ComandaFormValue | null | undefined>(undefined);
  const [showOpen, setShowOpen] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [methods, setMethods] = useState<string[]>(Object.keys(PAYMENT_LABEL));

  const visible = useMemo(
    () =>
      comandas.filter((c) => {
        if (c.status === "OPEN" && !showOpen) return false;
        if (c.status === "CLOSED" && !showClosed) return false;
        if (c.status === "CANCELLED" && !showCancelled) return false;
        if (from && c.occurredAt < from) return false;
        if (to && c.occurredAt > to) return false;
        if (c.status === "CLOSED" && c.paymentMethod && !methods.includes(c.paymentMethod)) return false;
        return true;
      }),
    [comandas, showOpen, showClosed, showCancelled, from, to, methods],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl">Comandas</h1>
          <CirclePlay size={16} className="text-ink-soft" />
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Nova comanda
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-line bg-white p-4">
          <FilterGroup title="Status">
            <CheckRow label="Não excluídas" checked={showOpen || showClosed} onChange={(on) => { setShowOpen(on); setShowClosed(on); }} />
            <CheckRow label="Excluídas" checked={showCancelled} onChange={setShowCancelled} />
          </FilterGroup>
          <FilterGroup title="Pagamento">
            <CheckRow label="Em aberto" checked={showOpen} onChange={setShowOpen} />
            <CheckRow label="Pago" checked={showClosed} onChange={setShowClosed} />
          </FilterGroup>
          <FilterGroup title="Período">
            <label className="grid gap-1 text-sm">
              <span className="text-ink-soft">De</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-ink-soft">Até</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
            </label>
          </FilterGroup>
          <FilterGroup title="Forma de pagamento">
            {Object.entries(PAYMENT_LABEL).map(([value, label]) => (
              <CheckRow
                key={value}
                label={label}
                checked={methods.includes(value)}
                onChange={(on) => setMethods((list) => (on ? [...list, value] : list.filter((item) => item !== value)))}
              />
            ))}
          </FilterGroup>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {visible.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhuma comanda neste filtro.</p>
          ) : (
            <>
              <div className="grid grid-cols-[80px_1fr_120px_120px_110px] items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-medium text-ink-soft">
                <span>Ticket</span>
                <span>Cliente</span>
                <span>Status</span>
                <span className="text-right">Total</span>
                <span className="text-right">Data</span>
              </div>
              <ul>
                {visible.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-0">
                    {c.status === "OPEN" ? (
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="grid w-full grid-cols-[80px_1fr_120px_120px_110px] items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <Row comanda={c} />
                      </button>
                    ) : (
                      <Link
                        href={`/comandas/${c.id}`}
                        className="grid grid-cols-[80px_1fr_120px_120px_110px] items-center gap-2 px-4 py-3 hover:bg-slate-50"
                      >
                        <Row comanda={c} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {editing !== undefined ? (
        <ComandaDrawer
          key={editing?.id ?? "new"}
          open
          comanda={editing}
          nextNumber={nextNumber}
          clients={clients}
          professionals={professionals}
          services={services}
          products={products}
          paymentMethods={paymentMethods}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}

function Row({ comanda }: { comanda: ComandaFormValue }) {
  return (
    <>
      <span className="font-medium text-blue-700">#{comanda.number}</span>
      <span className="truncate">{comanda.clientName}</span>
      <span>
        <Badge color={COMANDA_STATUS_COLOR[comanda.status as ComandaStatus]}>
          {COMANDA_STATUS_LABEL[comanda.status as ComandaStatus]}
        </Badge>
      </span>
      <span className="text-right text-sm">{formatBRL(comanda.totalCents)}</span>
      <span className="text-right text-sm text-ink-soft">{formatShortDate(new Date(`${comanda.occurredAt}T12:00:00`))}</span>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-blue-600" />
      {label}
    </label>
  );
}
