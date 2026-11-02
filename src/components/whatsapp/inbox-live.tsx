"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { markConversationOpened, sendInboxComposing, sendWhatsApp } from "@/app/actions/whatsapp";

export function InboxDbRefresh({ conversationId }: { conversationId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!conversationId) return;
    void markConversationOpened(conversationId);
  }, [conversationId]);

  return null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Enviando..." : "Enviar"}</Button>;
}

export function InboxComposer({
  conversationId,
  phone,
  hidePhones,
  receptionistEnabled,
  receptionistName,
  botPaused,
}: {
  conversationId: string;
  phone: string;
  hidePhones: boolean;
  receptionistEnabled: boolean;
  receptionistName: string;
  botPaused: boolean;
}) {
  const [body, setBody] = useState("");
  const typingTimer = useRef<number | null>(null);
  const lastComposing = useRef(0);

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, []);

  function queueComposing() {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      const now = Date.now();
      if (now - lastComposing.current < 2000) return;
      lastComposing.current = now;
      void sendInboxComposing(conversationId);
    }, 600);
  }

  return (
    <form
      action={async (formData) => {
        const result = await sendWhatsApp(formData);
        if (result && "ok" in result) setBody("");
      }}
      className="grid shrink-0 gap-2 border-t border-line bg-paper p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      {hidePhones ? null : <input type="hidden" name="phone" value={phone} />}
      {receptionistEnabled && !botPaused ? (
        <p className="text-xs text-ink-soft">Enviar por aqui pausa a {receptionistName} por 2 horas nesta conversa.</p>
      ) : null}
      <Textarea
        name="body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          if (event.target.value.trim()) queueComposing();
        }}
        placeholder="Escreva uma mensagem..."
        required
        className="min-h-20"
      />
      <SubmitButton />
    </form>
  );
}
