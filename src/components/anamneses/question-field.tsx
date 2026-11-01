"use client";

import { Input, Textarea } from "@/components/ui";
import type { AnamnesisAnswer, AnamnesisQuestion } from "@/lib/anamnesis";
import { cn } from "@/lib/utils";

export function QuestionField({
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
                value === opt ? "border-wine bg-gold-soft font-medium text-wine" : "border-line text-ink-soft hover:bg-sand",
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
                value === opt ? "border-wine bg-gold-soft font-medium text-wine" : "border-line text-ink-soft hover:bg-sand",
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
