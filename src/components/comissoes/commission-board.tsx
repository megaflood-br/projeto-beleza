"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, CirclePlay, Filter, RefreshCw, Zap } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { payCommissions } from "@/app/actions/finance";
import { updateCommissionRule } from "@/app/actions/team";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CommissionRow, CommissionRule } from "@/components/comissoes/types";
import type { CatalogAccount, CatalogMethod } from "@/lib/finance-catalog";

type Tab = "detalhadas" | "resumidas" | "pagas" | "config";

function moneyClass(cents: number) {
  if (cents < 0) return "font-medium text-red-600";
  if (cents > 0) return "font-medium text-emerald-600";
  return "text-ink-soft";
}

export function CommissionBoard({
  rows,
  professionals,
  accounts = [],
  methods = [],
  defaultFrom,
  defaultTo,
}: {
  rows: CommissionRow[];
  professionals: CommissionRule[];
  accounts?: CatalogAccount[];
  methods?: CatalogMethod[];
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("detalhadas");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [professionalId, setProfessionalId] = useState("");
  const [showPrevious, setShowPrevious] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaultAccount = accounts.find((a) => a.isDefault && a.active) ?? accounts.find((a) => a.active);
  const defaultMethod = methods.find((m) => m.active && m.code === "PIX") ?? methods.find((m) => m.active);
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? "");
  const [methodId, setMethodId] = useState(defaultMethod?.id ?? "");

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (from && row.date < from) return false;
        if (to && row.date > to) return false;
        if (professionalId && row.professionalId !== professionalId) return false;
        return true;
      }),
    [rows, from, to, professionalId],
  );

  const detailed = filtered.filter((row) => (showPrevious ? true : row.status === "PENDING"));
  const paid = filtered.filter((row) => row.status === "PAID");
  const tableRows = tab === "pagas" ? paid : detailed;
  const pendingVisible = detailed.filter((row) => row.status === "PENDING");
  const selectedSet = new Set(selected);
  const selectedRows = pendingVisible.filter((row) => selectedSet.has(row.id));
  const payRows = selectedRows.length ? selectedRows : pendingVisible;
  const commissionsTotal = payRows.reduce((sum, row) => sum + row.availableCents, 0);
  const net = commissionsTotal;

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; pending: number; paid: number }>();
    for (const row of filtered) {
      const current = map.get(row.professionalId) ?? { name: row.professionalName, count: 0, pending: 0, paid: 0 };
      current.count += 1;
      if (row.status === "PAID") current.paid += row.availableCents;
      else current.pending += row.availableCents;
      map.set(row.professionalId, current);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  function toggleAll(on: boolean) {
    setSelected(on ? pendingVisible.map((row) => row.id) : []);
  }

  function pay(ids: string[]) {
    if (!ids.length) {
      setError("Selecione as comissões para pagar.");
      return;
    }
    const fd = new FormData();
    for (const id of ids) fd.append("commissionId", id);
    if (accountId) fd.set("accountId", accountId);
    if (methodId) fd.set("methodId", methodId);
    setError(null);
    startTransition(async () => {
      const result = await payCommissions(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl">Comissões</h1>
            <CirclePlay size={16} className="text-ink-soft" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1 border-b border-line">
            <TabButton active={tab === "detalhadas"} onClick={() => setTab("detalhadas")}>
              Detalhadas
            </TabButton>
            <TabButton active={tab === "resumidas"} onClick={() => setTab("resumidas")}>
              Resumidas
            </TabButton>
            <TabButton active={tab === "pagas"} onClick={() => setTab("pagas")}>
              Pagas
            </TabButton>
            <TabButton active={tab === "config"} onClick={() => setTab("config")}>
              Configurações
              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                novo
              </span>
            </TabButton>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => document.getElementById("comissao-filtros")?.scrollIntoView({ behavior: "smooth" })}>
            <Filter size={16} />
            Filtrar
          </Button>
          <div className="relative">
            <Button type="button" variant="outline" onClick={() => setActionsOpen((open) => !open)}>
              <Zap size={16} />
              Ações
              <ChevronDown size={14} />
            </Button>
            {actionsOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-48 rounded-lg border border-line bg-white py-1 shadow-lg">
                <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-sand" onClick={() => { setActionsOpen(false); pay(selectedRows.map((r) => r.id)); }}>
                  Pagar selecionadas
                </button>
                <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-sand" onClick={() => { setActionsOpen(false); pay(pendingVisible.map((r) => r.id)); }}>
                  Pagar todas visíveis
                </button>
              </div>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={() => router.refresh()}>
            <RefreshCw size={16} />
            Atualizar
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside id="comissao-filtros" className="h-fit rounded-2xl border border-line bg-white p-4">
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Período</div>
            <label className="grid gap-1 text-sm">
              <span className="text-ink-soft">De</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
            </label>
            <label className="mt-2 grid gap-1 text-sm">
              <span className="text-ink-soft">Até</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
            </label>
          </div>
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Profissional</div>
            <SearchSelect
              placeholder="Todos"
              value={professionalId}
              onChange={setProfessionalId}
              emptyOption={{ value: "", label: "Todos" }}
              options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={showPrevious} onChange={(e) => setShowPrevious(e.target.checked)} className="accent-blue-600" />
            Mostrar comissões anteriores
          </label>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {tab === "config" ? (
            <SettingsTable professionals={professionals} />
          ) : tab === "resumidas" ? (
            <SummaryTable rows={summary} />
          ) : tableRows.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhuma comissão neste filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-ink-soft">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={pendingVisible.length > 0 && pendingVisible.every((row) => selectedSet.has(row.id))}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="accent-blue-600"
                      />
                    </th>
                    <th className="py-2.5 font-medium">Data</th>
                    <th className="font-medium">Item</th>
                    <th className="font-medium">Custo adicional</th>
                    <th className="font-medium">Taxa acumulada</th>
                    <th className="font-medium">Comissão</th>
                    <th className="font-medium">Desconto de auxiliares</th>
                    <th className="font-medium">Produtos consumidos</th>
                    <th className="px-3 text-right font-medium">Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-3 py-2.5">
                        {row.status === "PENDING" ? (
                          <input
                            type="checkbox"
                            checked={selectedSet.has(row.id)}
                            onChange={(e) =>
                              setSelected((list) => (e.target.checked ? [...list, row.id] : list.filter((id) => id !== row.id)))
                            }
                            className="accent-blue-600"
                          />
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-2.5">{formatShortDate(new Date(`${row.date}T12:00:00`))}</td>
                      <td className="py-2.5 pr-3">
                        <div>
                          {row.clientId ? (
                            <Link href={`/clientes/${row.clientId}`} className="font-medium text-blue-700">
                              {row.clientName}
                            </Link>
                          ) : (
                            <span className="font-medium">{row.clientName}</span>
                          )}
                          {row.refHref && row.refLabel ? (
                            <Link href={row.refHref} className="ml-1 text-blue-700">
                              {row.refLabel}
                            </Link>
                          ) : null}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {row.serviceName} ({row.quantity}x)
                        </div>
                      </td>
                      <td>{row.extraCostCents ? formatBRL(row.extraCostCents) : "—"}</td>
                      <td>
                        {row.feeCents ? (
                          <span>
                            {formatBRL(row.feeCents)}
                            {row.feePct != null ? ` / % ${row.feePct.toFixed(2).replace(".", ",")}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>% {row.percent.toFixed(2).replace(".", ",")} {row.typeLabel}</td>
                      <td>{row.assistantDiscountCents ? formatBRL(row.assistantDiscountCents) : "—"}</td>
                      <td>{row.consumedCents ? formatBRL(row.consumedCents) : "—"}</td>
                      <td className={cn("px-3 text-right", moneyClass(row.availableCents))}>{formatBRL(row.availableCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {tab !== "config" ? (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-line bg-white/95 px-6 py-3 backdrop-blur lg:left-64">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                Comissões <strong>{formatBRL(commissionsTotal)}</strong>
              </span>
              <span className="text-ink-soft">
                Vales <strong className="text-ink">{formatBRL(0)}</strong>
              </span>
              <span className="text-ink-soft">
                Bonificações <strong className="text-ink">{formatBRL(0)}</strong>
              </span>
              <span className="text-ink-soft">
                Solicitações de saída <strong className="text-ink">{formatBRL(0)}</strong>
              </span>
              <span>
                Líquido <strong className="text-emerald-600">{formatBRL(net)}</strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {accounts.length ? (
                <SearchSelect
                  value={accountId}
                  onChange={setAccountId}
                  placeholder="Conta"
                  className="w-44"
                  options={accounts.filter((a) => a.active).map((a) => ({ value: a.id, label: a.name }))}
                />
              ) : null}
              {methods.length ? (
                <SearchSelect
                  value={methodId}
                  onChange={setMethodId}
                  placeholder="Forma"
                  className="w-40"
                  options={methods.filter((m) => m.active).map((m) => ({ value: m.id, label: m.name }))}
                />
              ) : null}
              <Button type="button" variant="success" disabled={pending || !payRows.length} onClick={() => pay(payRows.map((row) => row.id))}>
                {pending ? "Pagando..." : "Pagar comissões"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex items-center border-b-2 px-4 py-2.5 text-sm",
        active ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function SummaryTable({ rows }: { rows: { name: string; count: number; pending: number; paid: number }[] }) {
  if (!rows.length) return <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhuma comissão neste filtro.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-ink-soft">
        <tr>
          <th className="px-4 py-2.5 font-medium">Profissional</th>
          <th className="font-medium">Itens</th>
          <th className="font-medium">Pendente</th>
          <th className="font-medium">Pago</th>
          <th className="px-4 text-right font-medium">Líquido</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-t border-line">
            <td className="px-4 py-2.5 font-medium">{row.name}</td>
            <td>{row.count}</td>
            <td className={moneyClass(row.pending)}>{formatBRL(row.pending)}</td>
            <td>{formatBRL(row.paid)}</td>
            <td className={cn("px-4 text-right", moneyClass(row.pending + row.paid))}>{formatBRL(row.pending + row.paid)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SettingsTable({ professionals }: { professionals: CommissionRule[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(formData: FormData) {
    setError(null);
    setPendingId(String(formData.get("id") ?? ""));
    try {
      const result = await updateCommissionRule(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      {error ? <p className="px-4 pt-3 text-sm text-red-600">{error}</p> : null}
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-ink-soft">
          <tr>
            <th className="px-4 py-2.5 font-medium">Profissional</th>
            <th className="font-medium">Comissão padrão</th>
            <th className="font-medium">Recebe comissão</th>
            <th className="px-4" />
          </tr>
        </thead>
        <tbody>
          {professionals.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="px-4 py-2.5 font-medium">{p.name}</td>
              <td colSpan={3} className="px-4 py-2">
                <form action={save} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={p.id} />
                  <Input name="commissionPct" type="number" min={0} max={100} defaultValue={p.commissionPct} className="h-10 w-24" />
                  <span className="text-ink-soft">%</span>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="receivesCommission" value="1" defaultChecked={p.receivesCommission} className="accent-blue-600" />
                    Sim
                  </label>
                  <Button type="submit" variant="outline" className="h-10" disabled={pendingId === p.id}>
                    {pendingId === p.id ? "Salvando..." : "Salvar"}
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
