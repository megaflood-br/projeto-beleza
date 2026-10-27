"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, CirclePlay, Plus, Search } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { ClientDrawer } from "@/components/clientes/client-drawer";
import { ConfirmProvider, useConfirm } from "@/components/confirm-dialog";
import { deleteClients } from "@/app/actions/clients";
import { clientDeleteCopy } from "@/lib/client-delete";
import { matchesClientSearch } from "@/lib/client-search";
import { cn, formatPhoneBR, initials } from "@/lib/utils";
import type { ClientFormValue } from "@/components/clientes/types";

export function ClientBoard(props: { clients: ClientFormValue[]; tags: string[] }) {
  return (
    <ConfirmProvider>
      <ClientBoardInner {...props} />
    </ConfirmProvider>
  );
}

function ClientBoardInner({
  clients,
  tags,
}: {
  clients: ClientFormValue[];
  tags: string[];
}) {
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [withPhone, setWithPhone] = useState(true);
  const [withoutPhone, setWithoutPhone] = useState(true);
  const [withDebt, setWithDebt] = useState(true);
  const [withoutDebt, setWithoutDebt] = useState(true);
  const [tagFilters, setTagFilters] = useState<string[]>(tags);
  const [includeUntagged, setIncludeUntagged] = useState(true);
  const router = useRouter();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ClientFormValue | null | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      clients.filter((c) => {
        if (!matchesClientSearch(c, query)) return false;
        if (c.active && !showActive) return false;
        if (!c.active && !showInactive) return false;
        if (c.phone && !withPhone) return false;
        if (!c.phone && !withoutPhone) return false;
        if (c.hasDebt && !withDebt) return false;
        if (!c.hasDebt && !withoutDebt) return false;
        const clientTags = c.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        if (clientTags.length === 0) return includeUntagged;
        return clientTags.some((tag) => tagFilters.includes(tag));
      }),
    [clients, query, showActive, showInactive, withPhone, withoutPhone, withDebt, withoutDebt, tagFilters, includeUntagged],
  );

  const visibleIds = useMemo(() => visible.map((client) => client.id), [visible]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const countLabel =
    visible.length === clients.length
      ? `${clients.length.toLocaleString("pt-BR")} cliente${clients.length === 1 ? "" : "s"}`
      : `${visible.length.toLocaleString("pt-BR")} de ${clients.length.toLocaleString("pt-BR")} clientes`;

  function toggleOne(id: string, on: boolean) {
    setSelected((current) => (on ? [...new Set([...current, id])] : current.filter((item) => item !== id)));
  }

  function toggleVisible(on: boolean) {
    setSelected((current) => {
      if (on) return [...new Set([...current, ...visibleIds])];
      return current.filter((id) => !visibleIds.includes(id));
    });
  }

  async function runDelete(scope: "selected" | "all") {
    const ids = scope === "all" ? clients.map((client) => client.id) : selected;
    if (ids.length === 0) {
      setError(scope === "selected" ? "Marque pelo menos um cliente para excluir." : "Não há clientes para excluir.");
      return;
    }
    const copy = clientDeleteCopy(ids.length, scope === "all" ? "all" : ids.length === 1 ? "one" : "selected");
    if (!(await confirm(copy))) return;
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("scope", scope === "all" ? "all" : "ids");
    form.set("ids", ids.join(","));
    try {
      const result = await deleteClients(form);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSelected([]);
      setEditing(undefined);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl">Clientes</h1>
            <CirclePlay size={16} className="text-ink-soft" />
          </div>
          <p className="mt-1 text-sm text-ink-soft">{countLabel}</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo cliente
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-line bg-white p-4">
          <FilterGroup title="Status">
            <CheckRow label="Ativos" checked={showActive} onChange={setShowActive} />
            <CheckRow label="Inativos" checked={showInactive} onChange={setShowInactive} />
          </FilterGroup>
          <FilterGroup title="Celular">
            <CheckRow label="Com celular" checked={withPhone} onChange={setWithPhone} />
            <CheckRow label="Sem celular" checked={withoutPhone} onChange={setWithoutPhone} />
          </FilterGroup>
          <FilterGroup title="Débitos">
            <CheckRow label="Com débito" checked={withDebt} onChange={setWithDebt} />
            <CheckRow label="Sem débito" checked={withoutDebt} onChange={setWithoutDebt} />
          </FilterGroup>
          <FilterGroup title="Hashtags">
            {tags.map((tag) => (
              <CheckRow
                key={tag}
                label={`#${tag}`}
                checked={tagFilters.includes(tag)}
                onChange={(on) => setTagFilters((list) => (on ? [...list, tag] : list.filter((item) => item !== tag)))}
              />
            ))}
            <CheckRow label="Sem hashtag" checked={includeUntagged} onChange={setIncludeUntagged} />
          </FilterGroup>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nome, celular, e-mail ou hashtag"
                className="pl-9"
                type="search"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50 px-3 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <SelectBox
                checked={allVisibleSelected}
                onChange={toggleVisible}
                label="Selecionar todos visíveis"
              />
              Selecionar todos
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">
                {selected.length.toLocaleString("pt-BR")} selecionado{selected.length === 1 ? "" : "s"}
              </span>
              <Button type="button" variant="ghost" disabled={pending || selected.length === 0} onClick={() => setSelected([])}>
                Limpar
              </Button>
              <Button type="button" variant="danger" disabled={pending || selected.length === 0} onClick={() => void runDelete("selected")}>
                {pending ? "Excluindo..." : "Excluir selecionados"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-red-600"
                disabled={pending || clients.length === 0}
                onClick={() => void runDelete("all")}
              >
                Excluir todos
              </Button>
            </div>
          </div>
          {error ? <p className="px-4 py-2 text-sm text-red-600">{error}</p> : null}
          {visible.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">
              {query.trim() ? "Nenhum cliente encontrado nessa busca." : "Nenhum cliente neste filtro."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 border-b border-line px-3 py-2.5 text-sm font-medium text-ink-soft sm:grid-cols-[44px_1fr_10rem]">
                <span className="sr-only">Selecionar</span>
                <span>Nome</span>
                <span className="hidden text-right sm:block">Celular</span>
              </div>
              <ul>
                {visible.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-0">
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 px-3 py-3 hover:bg-slate-50 sm:grid-cols-[44px_1fr_10rem]">
                      <SelectBox
                        checked={selected.includes(c.id)}
                        onChange={(on) => toggleOne(c.id, on)}
                        label={`Selecionar ${c.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-semibold text-white">
                          {c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(c.name)
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-blue-700">{c.name}</span>
                          <span className="block truncate text-xs text-ink-soft sm:hidden">{formatPhoneBR(c.phone)}</span>
                          <span className="block truncate text-xs text-ink-soft">
                            {c.tags
                              ? c.tags
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                                  .map((t) => `#${t}`)
                                  .join(" ")
                              : c.lastService ?? "Sem histórico"}
                          </span>
                        </span>
                      </button>
                      <span className="hidden text-right text-sm text-ink-soft sm:block">{formatPhoneBR(c.phone)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {editing !== undefined ? (
        <ClientDrawer
          key={editing?.id ?? "new"}
          open
          client={editing}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          tags={tags}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}

function SelectBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex h-10 w-10 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded border-2",
          checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-400 bg-white",
        )}
      >
        {checked ? <Check size={12} strokeWidth={3} /> : null}
      </span>
      <span className="sr-only">{label}</span>
    </label>
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
