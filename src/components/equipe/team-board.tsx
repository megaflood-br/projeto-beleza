"use client";

import { useMemo, useState } from "react";
import { CirclePlay, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { ProfessionalDrawer } from "@/components/equipe/professional-drawer";
import { cn, formatPhoneBR, initials } from "@/lib/utils";
import type { ProfessionalFormValue } from "@/components/equipe/types";

export function TeamBoard({
  professionals,
  services,
}: {
  professionals: ProfessionalFormValue[];
  services: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<"ativos" | "inativos">("ativos");
  const [editing, setEditing] = useState<ProfessionalFormValue | null | undefined>(undefined);

  const visible = useMemo(
    () => professionals.filter((p) => (tab === "ativos" ? p.active : !p.active)).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [professionals, tab],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl">Profissionais</h1>
          <CirclePlay size={16} className="text-ink-soft" />
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo profissional
        </Button>
      </div>

      <div className="flex gap-1 border-b border-line">
        <button
          type="button"
          onClick={() => setTab("ativos")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm",
            tab === "ativos" ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
          )}
        >
          Ativos
        </button>
        <button
          type="button"
          onClick={() => setTab("inativos")}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm",
            tab === "inativos" ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
          )}
        >
          Inativos
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">
            {tab === "ativos" ? "Nenhum profissional ativo." : "Nenhum profissional inativo."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_180px] items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-medium text-ink-soft">
              <span className="pl-16">Nome</span>
              <span className="text-right">Celular</span>
            </div>
            <ul>
              {visible.map((p) => (
                <li key={p.id} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="grid w-full grid-cols-[1fr_180px] items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <GripVertical size={16} className="shrink-0 text-slate-300" />
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
                        style={{ background: p.color }}
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(p.name)
                        )}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        {p.user?.role === "OWNER" || p.user?.role === "MANAGER" ? (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Admin</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-right text-sm text-ink-soft">{formatPhoneBR(p.phone)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {editing !== undefined ? (
        <ProfessionalDrawer
          key={editing?.id ?? "new"}
          open
          professional={editing}
          services={services}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}
