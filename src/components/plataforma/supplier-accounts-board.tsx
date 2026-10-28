"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Pencil, Plus } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { SupplierAccountDrawer } from "@/components/plataforma/supplier-account-drawer";
import { deleteTenantAccount, impersonateTenant, setTenantStatus } from "@/app/actions/platform";
import { useConfirm } from "@/components/confirm-dialog";
import { TENANT_STATUS_COLOR, TENANT_STATUS_LABEL } from "@/lib/constants";
import { formAction } from "@/lib/utils";
import type { SupplierAccountRow } from "@/components/plataforma/supplier-types";

export function SupplierAccountsBoard({ accounts }: { accounts: SupplierAccountRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SupplierAccountRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((row) => {
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || (row.ownerEmail ?? "").toLowerCase().includes(q) || (row.city ?? "").toLowerCase().includes(q);
    });
  }, [accounts, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Fornecedores</h1>
          <p className="mt-1 text-sm text-ink-soft">Empresas que vendem para os salões pela plataforma.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo fornecedor
        </Button>
      </div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar empresa ou e-mail" />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum fornecedor cadastrado.</p>
        ) : (
          <ul>
            {visible.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-ink-soft">
                    {row.ownerEmail ?? "Sem login"} · {row.products} produto{row.products === 1 ? "" : "s"} · {row.orders} pedido{row.orders === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={TENANT_STATUS_COLOR[row.status]}>{TENANT_STATUS_LABEL[row.status]}</Badge>
                  <Button type="button" variant="ghost" onClick={() => setEditing(row)}>
                    <Pencil size={14} />
                  </Button>
                  <form action={formAction(impersonateTenant)}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" variant="outline">
                      <LogIn size={14} />
                      Entrar
                    </Button>
                  </form>
                  {row.status !== "SUSPENDED" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        if (!(await confirm({ title: "Suspender este fornecedor?", danger: true }))) return;
                        const fd = new FormData();
                        fd.set("id", row.id);
                        fd.set("status", "SUSPENDED");
                        const result = await setTenantStatus(fd);
                        if (result && "error" in result && result.error) setError(result.error);
                        else router.refresh();
                      }}
                    >
                      Suspender
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600"
                    onClick={async () => {
                      if (!(await confirm({ title: "Excluir este fornecedor?", description: "Produtos e pedidos desta empresa saem da plataforma.", danger: true }))) return;
                      const fd = new FormData();
                      fd.set("id", row.id);
                      const result = await deleteTenantAccount(fd);
                      if (result && "error" in result && result.error) setError(result.error);
                      else router.refresh();
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editing !== undefined ? <SupplierAccountDrawer account={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
}
