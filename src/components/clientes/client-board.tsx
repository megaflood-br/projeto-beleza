"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CirclePlay, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { ClientDrawer } from "@/components/clientes/client-drawer";
import { cn, formatPhoneBR, initials } from "@/lib/utils";
import type { ClientFormValue } from "@/components/clientes/types";

export function ClientBoard({
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
  const [editing, setEditing] = useState<ClientFormValue | null | undefined>(undefined);

  const visible = useMemo(
    () =>
      clients.filter((c) => {
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
    [clients, showActive, showInactive, withPhone, withoutPhone, withDebt, withoutDebt, tagFilters, includeUntagged],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl">Clientes</h1>
          <CirclePlay size={16} className="text-ink-soft" />
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
          {visible.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum cliente neste filtro.</p>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_180px] items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-medium text-ink-soft">
                <span className="pl-12">Nome</span>
                <span className="text-right">Celular</span>
              </div>
              <ul>
                {visible.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="grid w-full grid-cols-[1fr_180px] items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
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
                      </span>
                      <span className="text-right text-sm text-ink-soft">{formatPhoneBR(c.phone)}</span>
                    </button>
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
