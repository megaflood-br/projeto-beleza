"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { QuestionField } from "@/components/anamneses/question-field";
import { submitPublicAnamnesis } from "@/app/actions/anamnesis";
import {
  missingRequired,
  parseAnswers,
  serializeAnswers,
  type AnamnesisAnswer,
  type AnamnesisAnswers,
  type AnamnesisQuestion,
} from "@/lib/anamnesis";

export function PublicAnamnesisForm({
  token,
  clientName,
  questions,
  initialAnswers,
}: {
  token: string;
  clientName: string;
  questions: AnamnesisQuestion[];
  initialAnswers: string;
}) {
  const [answers, setAnswers] = useState<AnamnesisAnswers>(() => parseAnswers(initialAnswers));
  const [signedName, setSignedName] = useState(clientName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function setAnswer(questionId: string, patch: Partial<AnamnesisAnswer>) {
    setAnswers((current) => ({
      ...current,
      [questionId]: { value: current[questionId]?.value ?? "", detail: current[questionId]?.detail, ...patch },
    }));
  }

  async function onSubmit() {
    setError(null);
    const missing = missingRequired(questions, answers);
    if (missing.length) {
      setError(`Preencha: ${missing.join(", ")}.`);
      return;
    }
    if (!signedName.trim()) {
      setError("Digite seu nome completo para assinar a ficha.");
      return;
    }
    setPending(true);
    const formData = new FormData();
    formData.set("token", token);
    formData.set("signedName", signedName);
    formData.set("answers", serializeAnswers(answers));
    const result = await submitPublicAnamnesis(formData);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-6 text-center">
        <h2 className="font-display text-2xl">Ficha enviada</h2>
        <p className="mt-2 text-sm text-ink-soft">O salão já recebeu suas respostas. Pode fechar esta página.</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      {questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          answer={answers[question.id]}
          onChange={(patch) => setAnswer(question.id, patch)}
        />
      ))}
      <Field label="Seu nome completo (assinatura)" required>
        <Input value={signedName} onChange={(event) => setSignedName(event.target.value)} required />
      </Field>
      {error ? <p className="text-sm text-warn">{error}</p> : null}
      <Button disabled={pending}>{pending ? "Enviando..." : "Enviar ficha"}</Button>
    </form>
  );
}
