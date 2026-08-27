"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { deleteAnamnesis, saveAnamnesis } from "@/app/actions/anamnesis";
import {
  ANAMNESIS_AREA_LABEL,
  collectAlerts,
  missingRequired,
  parseAnswers,
  parseQuestions,
  serializeAnswers,
  type AnamnesisAnswer,
  type AnamnesisAnswers,
  type AnamnesisQuestion,
} from "@/lib/anamnesis";
import { calendarDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AnamnesisFormRow, AnamnesisRow } from "@/components/anamneses/types";

export function AnamnesisDrawer({
  open,
  record,
  forms,
  clients,
  professionals,
  lockedClientId,
  onClose,
}: {
  open: boolean;
  record: AnamnesisRow | null;
  forms: AnamnesisFormRow[];
  clients: { id: string; name: string; phone?: string }[];
  professionals: { id: string; name: string }[];
  lockedClientId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const activeForms = forms.filter((form) => form.active || form.id === record?.formId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clientId, setClientId] = useState(lockedClientId || record?.clientId || "");
  const [formId, setFormId] = useState(record?.formId || activeForms[0]?.id || "");
  const [professionalId, setProfessionalId] = useState(record?.professionalId ?? "");
  const [occurredAt, setOccurredAt] = useState(record?.occurredAt ?? calendarDate());
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [signedName, setSignedName] = useState(record?.signedName ?? "");
  const [answers, setAnswers] = useState<AnamnesisAnswers>(() => parseAnswers(record?.answers));

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === formId) ?? activeForms[0] ?? null,
    [activeForms, formId, forms],
  );
  const questions = selectedForm?.questions ?? [];
  const alerts = collectAlerts(questions, answers);

  if (!open) return null;

  function setAnswer(questionId: string, patch: Partial<AnamnesisAnswer>) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { value: current[questionId]?.value ?? "", detail: current[questionId]?.detail, ...patch },
    }));
  }

  async function submit(complete: boolean) {
    setError(null);
    if (complete) {
      const missing = missingRequired(questions, answers);
      if (missing.length) {
        setError(`Preencha: ${missing.join(", ")}.`);
        return;
      }
      if (!signedName.trim()) {
        setError("Informe o nome de quem assinou para concluir a ficha.");
        return;
      }
    }
    setPending(true);
    const fd = new FormData();
    if (record?.id) fd.set("id", record.id);
    fd.set("clientId", lockedClientId || clientId);
    fd.set("formId", formId);
    fd.set("professionalId", professionalId);
    fd.set("occurredAt", occurredAt);
    fd.set("notes", notes);
    fd.set("signedName", signedName);
    fd.set("answers", serializeAnswers(answers));
    fd.set("complete", complete ? "1" : "0");
    try {
      const result = await saveAnamnesis(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!record?.id) return;
    if (!confirm("Excluir esta anamnese?")) return;
    setPending(true);
    const fd = new FormData();
    fd.set("id", record.id);
    try {
      const result = await deleteAnamnesis(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{record ? "Anamnese" : "Nova anamnese"}</h2>
            <p className="text-sm text-ink-soft">Ficha de saúde vinculada ao cliente.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Cliente" required>
            {lockedClientId ? (
              <div className="flex h-11 items-center rounded-lg border border-line bg-sand px-3 text-sm">
                {clients.find((c) => c.id === lockedClientId)?.name ?? record?.clientName}
              </div>
            ) : (
              <SearchSelect
                options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone }))}
                value={clientId}
                onChange={setClientId}
                placeholder="Buscar cliente"
                required
              />
            )}
          </Field>
          <Field label="Ficha" required>
            <SearchSelect
              options={activeForms.map((form) => ({
                value: form.id,
                label: form.name,
                hint: ANAMNESIS_AREA_LABEL[form.area],
              }))}
              value={formId}
              onChange={(next) => {
                setFormId(next);
                if (next !== formId) setAnswers({});
              }}
              placeholder="Selecionar ficha"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Profissional">
              <SearchSelect
                options={professionals.map((p) => ({ value: p.id, label: p.name }))}
                value={professionalId}
                onChange={setProfessionalId}
                emptyOption={{ value: "", label: "Não informado" }}
                placeholder="Buscar"
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </Field>
          </div>

          {selectedForm?.description ? <p className="text-sm text-ink-soft">{selectedForm.description}</p> : null}

          {alerts.length ? (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Atenção clínica</div>
                <ul className="mt-1 list-disc pl-4">
                  {alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {questions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                answer={answers[question.id]}
                onChange={(patch) => setAnswer(question.id, patch)}
              />
            ))}
          </div>

          <Field label="Observações internas">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24" />
          </Field>
          <Field label="Assinatura do cliente" required>
            <Input
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              placeholder="Nome completo de quem assinou"
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-4">
          {record ? (
            <Button type="button" variant="ghost" className="text-red-600" disabled={pending} onClick={remove}>
              <Trash2 size={16} />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => submit(false)}>
              {pending ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button type="button" disabled={pending} onClick={() => submit(true)}>
              Concluir ficha
            </Button>
          </div>
        </footer>
      </aside>
    </div>
  );
}

function QuestionField({
  question,
  answer,
  onChange,
}: {
  question: AnamnesisQuestion;
  answer?: AnamnesisAnswer;
  onChange: (patch: Partial<AnamnesisAnswer>) => void;
}) {
  const value = answer?.value ?? "";
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="text-sm font-medium">
        {question.label}
        {question.required ? <span className="text-red-500"> *</span> : null}
      </div>
      {question.hint ? <p className="mt-0.5 text-xs text-ink-soft">{question.hint}</p> : null}

      {question.type === "yes_no" ? (
        <div className="mt-2 flex gap-2">
          {["yes", "no"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ value: opt, detail: opt === "yes" ? answer?.detail : "" })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                value === opt ? "border-blue-600 bg-blue-50 font-medium text-blue-700" : "border-line text-ink-soft hover:bg-sand",
              )}
            >
              {opt === "yes" ? "Sim" : "Não"}
            </button>
          ))}
        </div>
      ) : question.type === "choice" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange({ value: opt })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                value === opt ? "border-blue-600 bg-blue-50 font-medium text-blue-700" : "border-line text-ink-soft hover:bg-sand",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          {question.type === "long_text" ? (
            <Textarea value={value} onChange={(e) => onChange({ value: e.target.value })} />
          ) : (
            <Input value={value} onChange={(e) => onChange({ value: e.target.value })} />
          )}
        </div>
      )}

      {question.withDetail && value === "yes" ? (
        <Input
          className="mt-2"
          placeholder="Qual? Detalhe aqui"
          value={answer?.detail ?? ""}
          onChange={(e) => onChange({ detail: e.target.value })}
        />
      ) : null}
    </div>
  );
}
