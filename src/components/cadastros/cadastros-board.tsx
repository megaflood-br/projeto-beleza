"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CirclePlay, Filter, HelpCircle, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AccountDrawer } from "@/components/cadastros/account-drawer";
import { MethodDrawer } from "@/components/cadastros/method-drawer";
import { CategoryDrawer } from "@/components/cadastros/category-drawer";
import { deleteFinanceAccount, deleteFinanceCategory, deletePaymentMethod, togglePaymentFavorite } from "@/app/actions/cadastros";
import { accountDetailsLabel, feePercentLabel } from "@/lib/finance-catalog";
import { settlementLabel } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import type { AccountRow, CategoryRow, MethodRow } from "@/components/cadastros/types";

type Tab = "contas" | "formas" | "categorias";
const PAGE_SIZE = 20;

export function CadastrosBoard({
  accounts,
  methods,
  categories,
}: {
  accounts: AccountRow[];
  methods: MethodRow[];
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("contas");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [accountEdit, setAccountEdit] = useState<AccountRow | null | undefined>(undefined);
  const [methodEdit, setMethodEdit] = useState<MethodRow | null | undefined>(undefined);
  const [categoryEdit, setCategoryEdit] = useState<CategoryRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filteredAccounts = useMemo(
    () =>
      accounts.filter((a) => {
        if (!showInactive && !a.active) return false;
        if (!q) return true;
        return a.name.toLowerCase().includes(q) || a.details.toLowerCase().includes(q);
      }),
    [accounts, q, showInactive],
  );
  const filteredMethods = useMemo(
    () =>
      methods.filter((m) => {
        if (!showInactive && !m.active) return false;
        if (!q) return true;
        return m.name.toLowerCase().includes(q) || m.accountName.toLowerCase().includes(q);
      }),
    [methods, q, showInactive],
  );
  const filteredCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (!showInactive && !c.active) return false;
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
      }),
    [categories, q, showInactive],
  );

  const rows =
    tab === "contas" ? filteredAccounts : tab === "formas" ? filteredMethods : filteredCategories;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const paged = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
    setError(null);
  }

  async function runDelete(fn: (formData: FormData) => Promise<{ error?: string } | { ok: true }>, id: string) {
    const fd = new FormData();
    fd.set("id", id);
    const result = await fn(fd);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl">Cadastros</h1>
          <CirclePlay size={16} className="text-ink-soft" />
          <button type="button" className="rounded-full p-1 text-ink-soft hover:bg-sand" aria-label="Ajuda">
            <HelpCircle size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar"
              className="h-10 w-52 pl-9"
            />
          </div>
          <Button type="button" variant="outline" onClick={() => setShowFilters((v) => !v)}>
            <Filter size={16} />
            Filtrar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (tab === "contas") setAccountEdit(null);
              else if (tab === "formas") setMethodEdit(null);
              else setCategoryEdit(null);
            }}
          >
            <Plus size={16} />
            Novo
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line">
        <TabButton active={tab === "contas"} onClick={() => changeTab("contas")}>
          Contas
        </TabButton>
        <TabButton active={tab === "formas"} onClick={() => changeTab("formas")}>
          Formas de pagamento
        </TabButton>
        <TabButton active={tab === "categorias"} onClick={() => changeTab("categorias")}>
          Categorias
        </TabButton>
      </div>

      {showFilters ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-blue-600"
          />
          Mostrar inativos
        </label>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {tab === "contas" ? (
          <AccountsTable
            rows={paged as AccountRow[]}
            onEdit={setAccountEdit}
            onDelete={(id) => runDelete(deleteFinanceAccount, id)}
          />
        ) : null}
        {tab === "formas" ? (
          <MethodsTable
            rows={paged as MethodRow[]}
            onEdit={setMethodEdit}
            onDelete={(id) => runDelete(deletePaymentMethod, id)}
            onFavorite={async (id) => {
              const fd = new FormData();
              fd.set("id", id);
              await togglePaymentFavorite(fd);
              router.refresh();
            }}
          />
        ) : null}
        {tab === "categorias" ? (
          <CategoriesTable
            rows={paged as CategoryRow[]}
            onEdit={setCategoryEdit}
            onDelete={(id) => runDelete(deleteFinanceCategory, id)}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm text-ink-soft">
          <span>
            {total} no total
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-line px-2 py-1 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-white">{currentPage}</span>
            <button
              type="button"
              className="rounded-lg border border-line px-2 py-1 disabled:opacity-40"
              disabled={currentPage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              ›
            </button>
            <span>{PAGE_SIZE} / página</span>
          </div>
        </div>
      </div>

      {accountEdit !== undefined ? (
        <AccountDrawer key={accountEdit?.id ?? "new-account"} open account={accountEdit} onClose={() => setAccountEdit(undefined)} />
      ) : null}
      {methodEdit !== undefined ? (
        <MethodDrawer
          key={methodEdit?.id ?? "new-method"}
          open
          method={methodEdit}
          accounts={accounts}
          onClose={() => setMethodEdit(undefined)}
        />
      ) : null}
      {categoryEdit !== undefined ? (
        <CategoryDrawer key={categoryEdit?.id ?? "new-cat"} open category={categoryEdit} onClose={() => setCategoryEdit(undefined)} />
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

function AccountsTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: AccountRow[];
  onEdit: (row: AccountRow) => void;
  onDelete: (id: string) => void;
}) {
  if (!rows.length) return <Empty>Nenhuma conta cadastrada.</Empty>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-ink-soft">
        <tr>
          <th className="w-10 px-4 py-3">
            <span className="sr-only">Selecionar</span>
          </th>
          <th className="font-medium">Nome</th>
          <th className="font-medium">Detalhes</th>
          <th className="w-24 px-4" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-4 py-3">
              <input type="checkbox" className="accent-blue-600" aria-label={row.name} />
            </td>
            <td className="py-3 font-medium">{row.name}</td>
            <td className="py-3 text-ink-soft">{accountDetailsLabel(row)}</td>
            <td className="px-4 py-3">
              <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row.id)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MethodsTable({
  rows,
  onEdit,
  onDelete,
  onFavorite,
}: {
  rows: MethodRow[];
  onEdit: (row: MethodRow) => void;
  onDelete: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  if (!rows.length) return <Empty>Nenhuma forma de pagamento cadastrada.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-slate-50 text-left text-ink-soft">
          <tr>
            <th className="w-10 px-4 py-3">
              <span className="sr-only">Selecionar</span>
            </th>
            <th className="font-medium">Nome</th>
            <th className="font-medium">Taxa</th>
            <th className="font-medium">Conta</th>
            <th className="font-medium">Prazo de recebimento</th>
            <th className="font-medium">Baixa no financeiro</th>
            <th className="w-28 px-4" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line">
              <td className="px-4 py-3">
                <input type="checkbox" className="accent-blue-600" aria-label={row.name} />
              </td>
              <td className="py-3 font-medium">{row.name}</td>
              <td className="py-3">{feePercentLabel(row.feeBps)}</td>
              <td className="py-3">{row.accountName}</td>
              <td className="py-3">{settlementLabel(row.settlementDays)}</td>
              <td className="py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                    row.autoSettle ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {row.autoSettle ? "Baixa automática" : "Baixa manual"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className={cn("rounded-lg p-1.5", row.favorite ? "text-amber-500" : "text-ink-soft hover:bg-sand")}
                    aria-label={row.favorite ? "Remover dos favoritos" : "Favoritar"}
                    onClick={() => onFavorite(row.id)}
                  >
                    <Star size={16} fill={row.favorite ? "currentColor" : "none"} />
                  </button>
                  <button type="button" className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50" aria-label="Editar" onClick={() => onEdit(row)}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Excluir" onClick={() => onDelete(row.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: CategoryRow[];
  onEdit: (row: CategoryRow) => void;
  onDelete: (id: string) => void;
}) {
  if (!rows.length) return <Empty>Nenhuma categoria cadastrada.</Empty>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-ink-soft">
        <tr>
          <th className="w-10 px-4 py-3">
            <span className="sr-only">Selecionar</span>
          </th>
          <th className="font-medium">Nome</th>
          <th className="font-medium">Tipo</th>
          <th className="w-24 px-4" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-line">
            <td className="px-4 py-3">
              <input type="checkbox" className="accent-blue-600" aria-label={row.name} />
            </td>
            <td className="py-3 font-medium">{row.name}</td>
            <td className="py-3">{row.type === "EXPENSE" ? "Despesa" : "Receita"}</td>
            <td className="px-4 py-3">
              <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row.id)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button type="button" className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50" aria-label="Editar" onClick={onEdit}>
        <Pencil size={16} />
      </button>
      <button type="button" className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Excluir" onClick={onDelete}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-12 text-center text-sm text-ink-soft">{children}</p>;
}
