"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CirclePlay, Pencil, Plus } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { AnamnesisDrawer } from "@/components/anamneses/anamnesis-drawer";
import { AnamnesisFormDrawer } from "@/components/anamneses/form-drawer";
import { deleteAnamnesisForm } from "@/app/actions/anamnesis";
import {
  ANAMNESIS_AREA_LABEL,
  ANAMNESIS_STATUS_COLOR,
  ANAMNESIS_STATUS_LABEL,
  type AnamnesisStatus,
} from "@/lib/anamnesis";
import { formatMediumDate, zonedDateTime } from "@/lib/dates";
import { cn, formatPhoneBR } from "@/lib/utils";
import type { AnamnesisFormRow, AnamnesisRow } from "@/components/anamneses/types";

type Tab = "registros" | "fichas";

export function AnamnesisBoard({
  records,
  forms,
  clients,
  professionals,
}: {
  records: AnamnesisRow[];
  forms: AnamnesisFormRow[];
  clients: { id: string; name: string; phone: string }[];
  professionals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("registros");
  const [query, setQuery] = useState("");
  const [showDraft, setShowDraft] = useState(true);
  const [showDone, setShowDone] = useState(true);
  const [editing, setEditing] = useState<AnamnesisRow | null | undefined>(undefined);
  const [editingForm, setEditingForm] = useState<AnamnesisFormRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      records.filter((row) => {
        if (row.status === "DRAFT" && !showDraft) return false;
        if (row.status === "COMPLETED" && !showDone) return false;
        if (!q) return true;
        return (
          row.clientName.toLowerCase().includes(q) ||
          row.formName.toLowerCase().includes(q) ||
          (row.professionalName ?? "").toLowerCase().includes(q)
        );
      }),
    [q, records, showDone, showDraft],
  );

  async function removeForm(id: string) {
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    const result = await deleteAnamnesisForm(fd);
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
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl">Anamnese</h1>
            <CirclePlay size={16} className="text-ink-soft" />
          </div>
          <p className="mt-1 text-sm text-ink-soft">Fichas de saúde vinculadas a cada cliente.</p>
        </div>
        <Button type="button" onClick={() => (tab === "fichas" ? setEditingForm(null) : setEditing(null))}>
          <Plus size={16} />
          {tab === "fichas" ? "Nova ficha" : "Nova anamnese"}
        </Button>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["registros", "Preenchidas"],
            ["fichas", "Modelos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              tab === id ? "border-blue-600 bg-blue-50 font-medium text-blue-700" : "border-line text-ink-soft hover:bg-sand",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tab === "registros" ? (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-line bg-white p-4">
            <div className="text-sm font-semibold">Status</div>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
              Concluídas
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showDraft} onChange={(e) => setShowDraft(e.target.checked)} />
              Rascunhos
            </label>
            <div className="mt-4">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente ou ficha" />
            </div>
          </aside>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {!visible.length ? (
              <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhuma anamnese neste filtro.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-ink-soft">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="font-medium">Ficha</th>
                    <th className="font-medium">Profissional</th>
                    <th className="font-medium">Data</th>
                    <th className="px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id} className="border-t border-line hover:bg-sand/60">
                      <td className="px-4 py-2.5">
                        <Link href={`/clientes/${row.clientId}?tab=anamneses`} className="font-medium text-wine">
                          {row.clientName}
                        </Link>
                        <div className="text-xs text-ink-soft">{formatPhoneBR(row.clientPhone)}</div>
                      </td>
                      <td>
                        <button type="button" className="text-left font-medium hover:text-wine" onClick={() => setEditing(row)}>
                          {row.formName}
                        </button>
                        <div className="text-xs text-ink-soft">{ANAMNESIS_AREA_LABEL[row.formArea]}</div>
                        {row.alerts.length ? (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertTriangle size={12} />
                            {row.alerts.length} alerta{row.alerts.length > 1 ? "s" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td>{row.professionalName ?? "—"}</td>
                      <td>{formatMediumDate(zonedDateTime(row.occurredAt, "12:00"))}</td>
                      <td className="px-4">
                        <Badge color={ANAMNESIS_STATUS_COLOR[row.status as AnamnesisStatus]}>
                          {ANAMNESIS_STATUS_LABEL[row.status as AnamnesisStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {forms.map((form) => (
            <div key={form.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{form.name}</div>
                  <div className="text-xs text-ink-soft">
                    {ANAMNESIS_AREA_LABEL[form.area]} · {form.questions.length} perguntas · {form.records} preenchidas
                  </div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", form.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                  {form.active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{form.description || "Sem descrição."}</p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingForm(form)}>
                  <Pencil size={14} />
                  Editar
                </Button>
                <Button type="button" variant="ghost" className="text-red-600" onClick={() => removeForm(form.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined ? (
        <AnamnesisDrawer
          open
          record={editing}
          forms={forms}
          clients={clients}
          professionals={professionals}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
      {editingForm !== undefined ? (
        <AnamnesisFormDrawer open form={editingForm} onClose={() => setEditingForm(undefined)} />
      ) : null}
    </div>
  );
}
