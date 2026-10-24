"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LogIn, Pencil, Plus, Search } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { TenantDrawer } from "@/components/plataforma/tenant-drawer";
import { deleteTenantAccount, impersonateTenant, setTenantStatus } from "@/app/actions/platform";
import {
  TENANT_PLAN_LABEL,
  TENANT_STATUS_COLOR,
  TENANT_STATUS_LABEL,
  type TenantPlan,
  type TenantStatus,
} from "@/lib/constants";
import { formatMediumDate } from "@/lib/dates";
import { cn, formAction } from "@/lib/utils";
import type { TenantAccountRow } from "@/components/plataforma/types";

export function PlatformBoard({ accounts }: { accounts: TenantAccountRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TenantStatus | "ALL">("ALL");
  const [editing, setEditing] = useState<TenantAccountRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((row) => {
      if (status !== "ALL" && row.status !== status) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        (row.ownerEmail ?? "").toLowerCase().includes(q) ||
        (row.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [accounts, query, status]);

  const counts = {
    total: accounts.length,
    active: accounts.filter((a) => a.status === "ACTIVE").length,
    trial: accounts.filter((a) => a.status === "TRIAL").length,
    suspended: accounts.filter((a) => a.status === "SUSPENDED").length,
  };

  async function run(fn: (fd: FormData) => Promise<{ error?: string } | { ok: true }>, id: string, extra?: Record<string, string>) {
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
          <h1 className="font-display text-3xl">Plataforma</h1>
          <p className="mt-1 text-sm text-ink-soft">Gerencie todos os salões da operação multi-tenant.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Nova conta
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Contas" value={counts.total} />
        <Stat label="Ativas" value={counts.active} />
        <Stat label="Trial" value={counts.trial} />
        <Stat label="Suspensas" value={counts.suspended} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
          <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar salão, slug ou e-mail" />
        </div>
        {(["ALL", ...Object.keys(TENANT_STATUS_LABEL)] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key as TenantStatus | "ALL")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              status === key ? "border-blue-600 bg-blue-50 font-medium text-blue-700" : "border-line text-ink-soft hover:bg-sand",
            )}
          >
            {key === "ALL" ? "Todas" : TENANT_STATUS_LABEL[key as TenantStatus]}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {!visible.length ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhuma conta neste filtro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Salão</th>
                <th className="font-medium">Dono</th>
                <th className="font-medium">Plano</th>
                <th className="font-medium">Uso</th>
                <th className="font-medium">Status</th>
                <th className="px-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-ink-soft">
                      /{row.slug} {row.city ? `· ${row.city}` : ""}
                    </div>
                    <div className="text-[11px] text-ink-soft">desde {formatMediumDate(new Date(row.createdAt))}</div>
                  </td>
                  <td>
                    <div>{row.ownerName ?? "—"}</div>
                    <div className="text-xs text-ink-soft">{row.ownerEmail ?? ""}</div>
                  </td>
                  <td>{TENANT_PLAN_LABEL[row.plan as TenantPlan] ?? row.plan}</td>
                  <td className="text-ink-soft">
                    {row.users} usuários · {row.clients} clientes · {row.appointments} agend.
                  </td>
                  <td>
                    <Badge color={TENANT_STATUS_COLOR[row.status]}>{TENANT_STATUS_LABEL[row.status]}</Badge>
                  </td>
                  <td className="px-4">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => setEditing(row)}>
                        <Pencil size={12} />
                        Editar
                      </Button>
                      <form action={formAction(impersonateTenant)}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button type="submit" variant="ghost" className="h-8 px-2 text-xs">
                          <LogIn size={12} />
                          Entrar
                        </Button>
                      </form>
                      {row.status === "SUSPENDED" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-emerald-700"
                          onClick={() => run(setTenantStatus, row.id, { status: "ACTIVE" })}
                        >
                          Ativar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-amber-700"
                          onClick={() => run(setTenantStatus, row.id, { status: "SUSPENDED" })}
                        >
                          Suspender
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-red-600"
                        onClick={() => {
                          if (confirm(`Excluir ${row.name} e todos os dados deste salão?`)) {
                            run(deleteTenantAccount, row.id);
                          }
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

      {editing !== undefined ? <TenantDrawer open account={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Building2 size={14} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
