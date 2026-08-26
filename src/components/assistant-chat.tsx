"use client";

import { useState, useTransition } from "react";
import { askAssistant } from "@/app/actions/ai";
import { Button, Card, Textarea } from "@/components/ui";

export function AssistantChat({ greeting }: { greeting: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: greeting },
  ]);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex min-h-[560px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${m.role === "assistant" ? "bg-sand" : "ml-auto bg-wine text-white"}`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="mt-4 grid gap-2"
        action={(formData) => {
          const question = String(formData.get("question") ?? "");
          if (!question.trim()) return;
          setMessages((prev) => [...prev, { role: "user", text: question }]);
          startTransition(async () => {
            const result = await askAssistant(question);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: `${result.answer}${result.source === "local" ? " (modo local)" : ""}` },
            ]);
          });
        }}
      >
        <Textarea name="question" placeholder="Ex.: Quem está ociosa hoje? Como recuperar clientes inativos?" />
        <Button disabled={pending}>{pending ? "Pensando..." : "Perguntar à MegaBeauty"}</Button>
      </form>
    </Card>
  );
}
