"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, Pencil, Plus, Search } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { PlanDrawer } from "@/components/plataforma/plan-drawer";
import { deletePlatformPlan, setPlatformPlanActive } from "@/app/actions/plans";
import { formatPlanPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { PlatformPlanRow } from "@/components/plataforma/plan-types";

export function PlanBoard({ plans }: { plans: PlatformPlanRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PlatformPlanRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(q) ||
        plan.slug.toLowerCase().includes(q) ||
        (plan.description ?? "").toLowerCase().includes(q),
    );
  }, [plans, query]);

  async function run(fn: (fd: FormData) => Promise<{ error?: string }>, id: string, extra?: Record<string, string>) {
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    if (extra) for (const [key, value] of Object.entries(extra)) fd.set(key, value);
    const result = await fn(fd);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Planos</h1>
          <p className="mt-1 text-sm text-ink-soft">Cadastre os tipos de plano que a revenda oferece aos salões.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo plano
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tipos" value={plans.length} />
        <Stat label="Ativos" value={plans.filter((plan) => plan.active).length} />
        <Stat label="Contas" value={plans.reduce((sum, plan) => sum + plan.accounts, 0)} />
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
        <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar plano" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {!visible.length ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum plano cadastrado neste filtro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Plano</th>
                <th className="font-medium">Preço</th>
                <th className="font-medium">Trial</th>
                <th className="font-medium">Contas</th>
                <th className="font-medium">Status</th>
                <th className="px-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((plan) => (
                <tr key={plan.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{plan.name}</div>
                      {plan.highlighted ? <Badge>Popular</Badge> : null}
                      {plan.isDefault ? <Badge color="#0D9488">Padrão</Badge> : null}
                    </div>
                    <div className="text-xs text-ink-soft">/{plan.slug}</div>
                    {plan.description ? <div className="mt-1 max-w-md text-xs text-ink-soft">{plan.description}</div> : null}
                    {plan.features.length ? (
                      <div className="mt-1 text-[11px] text-ink-soft">{plan.features.slice(0, 3).join(" · ")}</div>
                    ) : null}
                  </td>
                  <td>{formatPlanPrice(plan.priceCents, plan.interval)}</td>
                  <td className="text-ink-soft">{plan.trialDays} dias</td>
                  <td className="text-ink-soft">{plan.accounts}</td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        plan.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-ink-soft",
                      )}
                    >
                      {plan.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => setEditing(plan)}>
                        <Pencil size={12} />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => run(setPlatformPlanActive, plan.id, { active: plan.active ? "0" : "1" })}
                      >
                        {plan.active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-red-600"
                        onClick={() => {
                          if (confirm(`Excluir o plano ${plan.name}?`)) run(deletePlatformPlan, plan.id);
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== undefined ? <PlanDrawer open plan={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <BadgePercent size={14} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
