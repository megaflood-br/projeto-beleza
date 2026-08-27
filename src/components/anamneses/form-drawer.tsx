"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveAnamnesisForm } from "@/app/actions/anamnesis";
import {
  ANAMNESIS_AREAS,
  ANAMNESIS_AREA_LABEL,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPES,
  serializeQuestions,
  type AnamnesisQuestion,
  type QuestionType,
} from "@/lib/anamnesis";
import { cn, slugify } from "@/lib/utils";
import type { AnamnesisFormRow } from "@/components/anamneses/types";

function emptyQuestion(): AnamnesisQuestion {
  return {
    id: `q-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    type: "yes_no",
    required: true,
    alertOn: "yes",
    withDetail: true,
  };
}

export function AnamnesisFormDrawer({
  open,
  form,
  onClose,
}: {
  open: boolean;
  form: AnamnesisFormRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(form?.name ?? "");
  const [area, setArea] = useState(form?.area ?? "geral");
  const [description, setDescription] = useState(form?.description ?? "");
  const [active, setActive] = useState(form?.active ?? true);
  const [questions, setQuestions] = useState<AnamnesisQuestion[]>(form?.questions?.length ? form.questions : [emptyQuestion()]);

  if (!open) return null;

  function patchQuestion(id: string, patch: Partial<AnamnesisQuestion>) {
    setQuestions((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function submit() {
    setError(null);
    const cleaned = questions
      .map((item) => ({ ...item, label: item.label.trim(), id: item.id || slugify(item.label) }))
      .filter((item) => item.label);
    if (!name.trim()) {
      setError("Informe o nome da ficha.");
      return;
    }
    if (!cleaned.length) {
      setError("Inclua pelo menos uma pergunta.");
      return;
    }
    setPending(true);
    const fd = new FormData();
    if (form?.id) fd.set("id", form.id);
    fd.set("name", name);
    fd.set("slug", form?.slug ?? slugify(name));
    fd.set("area", area);
    fd.set("description", description);
    fd.set("active", active ? "1" : "0");
    fd.set("questions", serializeQuestions(cleaned));
    try {
      const result = await saveAnamnesisForm(fd);
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
            <h2 className="text-lg font-semibold">{form ? "Editar ficha" : "Nova ficha"}</h2>
            <p className="text-sm text-ink-soft">Modelo reutilizável para preencher no cliente.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Nome" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Anamnese de micropigmentação" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Área">
              <Select value={area} onChange={(e) => setArea(e.target.value as typeof area)}>
                {ANAMNESIS_AREAS.map((item) => (
                  <option key={item} value={item}>
                    {ANAMNESIS_AREA_LABEL[item]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
                <option value="1">Ativa</option>
                <option value="0">Inativa</option>
              </Select>
            </Field>
          </div>
          <Field label="Descrição">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Perguntas</h3>
            <Button type="button" variant="outline" onClick={() => setQuestions((list) => [...list, emptyQuestion()])}>
              <Plus size={14} />
              Pergunta
            </Button>
          </div>
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
                  <span>Pergunta {index + 1}</span>
                  <button
                    type="button"
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    onClick={() => setQuestions((list) => list.filter((item) => item.id !== question.id))}
                    aria-label="Remover pergunta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <Input
                  value={question.label}
                  onChange={(e) => patchQuestion(question.id, { label: e.target.value })}
                  placeholder="Texto da pergunta"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select
                    value={question.type}
                    onChange={(e) => patchQuestion(question.id, { type: e.target.value as QuestionType })}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABEL[type]}
                      </option>
                    ))}
                  </Select>
                  <label className={cn("flex items-center gap-2 rounded-lg border border-line px-3 text-sm")}>
                    <input
                      type="checkbox"
                      checked={Boolean(question.required)}
                      onChange={(e) => patchQuestion(question.id, { required: e.target.checked })}
                    />
                    Obrigatória
                  </label>
                </div>
                {question.type === "choice" ? (
                  <Input
                    className="mt-2"
                    placeholder="Opções, separadas por vírgula"
                    value={(question.options ?? []).join(", ")}
                    onChange={(e) =>
                      patchQuestion(question.id, {
                        options: e.target.value.split(",").map((opt) => opt.trim()).filter(Boolean),
                      })
                    }
                  />
                ) : null}
                {question.type === "yes_no" ? (
                  <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={question.alertOn === "yes"}
                      onChange={(e) => patchQuestion(question.id, { alertOn: e.target.checked ? "yes" : undefined, withDetail: e.target.checked })}
                    />
                    Destacar alerta se a resposta for Sim
                  </label>
                ) : null}
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? "Salvando..." : "Salvar ficha"}
          </Button>
        </footer>
      </aside>
    </div>
  );
}
