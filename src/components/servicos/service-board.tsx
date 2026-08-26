"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CirclePlay, Plus, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui";
import { ServiceDrawer } from "@/components/servicos/service-drawer";
import { toggleServiceFavorite } from "@/app/actions/services";
import { formatBRL } from "@/lib/money";
import { minutesToLabel } from "@/lib/dates";
import { cn, initials } from "@/lib/utils";
import type { ServiceFormValue } from "@/components/servicos/types";

export function ServiceBoard({
  services,
  categories,
  products,
}: {
  services: ServiceFormValue[];
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [starred, setStarred] = useState(true);
  const [unstarred, setUnstarred] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>(categories.map((c) => c.id));
  const [includeUncategorized, setIncludeUncategorized] = useState(true);
  const [editing, setEditing] = useState<ServiceFormValue | null | undefined>(undefined);

  const visible = useMemo(
    () =>
      services.filter((s) => {
        if (s.active && !showActive) return false;
        if (!s.active && !showInactive) return false;
        if (s.favorite && !starred) return false;
        if (!s.favorite && !unstarred) return false;
        if (s.categoryId && !categoryIds.includes(s.categoryId)) return false;
        if (!s.categoryId && !includeUncategorized) return false;
        return true;
      }),
    [services, showActive, showInactive, starred, unstarred, categoryIds, includeUncategorized],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl">Serviços</h1>
          <CirclePlay size={16} className="text-ink-soft" />
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo serviço
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-line bg-white p-4">
          <FilterGroup title="Status">
            <CheckRow label="Ativos" checked={showActive} onChange={setShowActive} />
            <CheckRow label="Inativos" checked={showInactive} onChange={setShowInactive} />
          </FilterGroup>
          <FilterGroup title="Favoritos">
            <CheckRow label="Com estrela" checked={starred} onChange={setStarred} />
            <CheckRow label="Sem estrela" checked={unstarred} onChange={setUnstarred} />
          </FilterGroup>
          <FilterGroup title="Categorias">
            {categories.map((c) => (
              <CheckRow
                key={c.id}
                label={c.name}
                checked={categoryIds.includes(c.id)}
                onChange={(on) =>
                  setCategoryIds((ids) => (on ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                }
              />
            ))}
            <CheckRow label="Sem categoria" checked={includeUncategorized} onChange={setIncludeUncategorized} />
          </FilterGroup>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {visible.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum serviço neste filtro.</p>
          ) : (
            <ul>
              {visible.map((s) => (
                <li key={s.id} className="flex items-center gap-2 border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-semibold text-white"
                      style={{ background: s.color }}
                    >
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(s.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-blue-700">{s.name}</span>
                        <Tag size={14} className="shrink-0 text-slate-400" />
                      </div>
                      <div className="text-xs text-ink-soft">
                        {s.categoryName ?? "Sem categoria"} · {minutesToLabel(s.durationMin)}
                      </div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap">
                      {s.priceType === "from" ? "a partir de " : ""}
                      {formatBRL(s.priceCents)}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="mr-3 rounded-lg p-2 text-slate-400 hover:bg-sand"
                    aria-label={s.favorite ? "Remover favorito" : "Favoritar"}
                    onClick={async () => {
                      await toggleServiceFavorite(s.id);
                      router.refresh();
                    }}
                  >
                    <Star size={16} className={cn(s.favorite ? "fill-amber-400 text-amber-400" : "")} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editing !== undefined ? (
        <ServiceDrawer
          key={editing?.id ?? "new"}
          open
          service={editing}
          categories={categories}
          products={products}
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
