"use client";

import { Eye, Pencil, Printer, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  ANAMNESIS_AREA_LABEL,
  ANAMNESIS_STATUS_LABEL,
  anamnesisDocumentItems,
  parseAnswers,
  type AnamnesisStatus,
} from "@/lib/anamnesis";
import { formatMediumDate, zonedDateTime } from "@/lib/dates";
import { cn, formatPhoneBR } from "@/lib/utils";
import type { AnamnesisFormRow, AnamnesisRow } from "@/components/anamneses/types";

export function AnamnesisDocument({
  record,
  form,
  salonName,
  onClose,
  onEdit,
}: {
  record: AnamnesisRow;
  form: AnamnesisFormRow | null;
  salonName?: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const questions = form?.questions ?? [];
  const items = anamnesisDocumentItems(questions, parseAnswers(record.answers));
  const occurred = formatMediumDate(zonedDateTime(record.occurredAt, "12:00"));
  const signedAt = record.signedAt ? formatMediumDate(new Date(record.signedAt)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 print:static print:bg-white print:p-0">
      <button type="button" className="no-print absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative my-6 w-full max-w-3xl print:my-0 print:max-w-none">
        <div className="no-print mb-3 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X size={16} />
            Fechar
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil size={16} />
            Editar
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </Button>
        </div>

        <article
          id="anamnesis-document"
          className="print-root rounded-2xl bg-white px-8 py-10 shadow-2xl print:rounded-none print:px-0 print:py-0 print:shadow-none"
        >
          <header className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">Ficha de anamnese</p>
            {salonName ? <p className="mt-1 text-sm text-slate-500">{salonName}</p> : null}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{record.formName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {ANAMNESIS_AREA_LABEL[record.formArea]}
              {form?.description ? ` · ${form.description}` : ""}
            </p>
          </header>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DocField label="Cliente" value={record.clientName} />
            <DocField label="Celular" value={formatPhoneBR(record.clientPhone)} />
            <DocField label="Profissional" value={record.professionalName ?? "—"} />
            <DocField label="Data" value={occurred} />
            <DocField label="Status" value={ANAMNESIS_STATUS_LABEL[record.status as AnamnesisStatus] ?? record.status} />
          </dl>

          <ol className="mt-8 space-y-4">
            {items.map((item, index) => (
              <li key={item.id} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex gap-3">
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-slate-400">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.hint ? <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p> : null}
                    <p className={cn("mt-1 text-sm", item.alert ? "font-medium text-amber-800" : "text-slate-800")}>
                      {item.value}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {record.notes ? (
            <section className="mt-6">
              <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Observações internas</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{record.notes}</p>
            </section>
          ) : null}

          <footer className="mt-10 border-t border-slate-200 pt-6">
            <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Assinatura</h2>
            <p className="mt-3 text-sm">{record.signedName || "Não assinada"}</p>
            {signedAt ? <p className="mt-1 text-xs text-slate-500">Assinada em {signedAt}</p> : null}
            <div className="mt-8 h-px w-64 bg-slate-300" />
            <p className="mt-2 text-xs text-slate-500">Assinatura do cliente</p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function DocField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

export function ViewAnamnesisButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline" onClick={onClick}>
      <Eye size={14} />
      Visualizar
    </button>
  );
}
