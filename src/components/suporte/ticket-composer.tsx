"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createSupportTicket } from "@/app/actions/support";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABEL,
} from "@/lib/constants";
export function TicketComposer({
  open,
  side,
  tenants,
  onClose,
  onCreated,
}: {
  open: boolean;
  side: "PLATFORM" | "SALON";
  tenants?: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!open) return null;

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await createSupportTicket(formData);
      if (result && "error" in result && result.error) {
        setError(result.error ?? "Não foi possível abrir o ticket.");
        return;
      }
      if (result && "id" in result && result.id) onCreated(result.id);
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <form action={submit} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl">Novo ticket</h2>
            <p className="text-sm text-ink-soft">
              {side === "PLATFORM" ? "Abra um atendimento com o salão." : "Descreva o pedido de ajuda para o suporte."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand">
            <X size={18} />
          </button>
        </div>
        {side === "PLATFORM" ? (
          <Field label="Salão" required>
            <Select name="tenantId" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {(tenants ?? []).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Categoria">
            <Select name="category" defaultValue="ajuda">
              {SUPPORT_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {SUPPORT_CATEGORY_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select name="priority" defaultValue="NORMAL">
              {SUPPORT_PRIORITIES.map((key) => (
                <option key={key} value={key}>
                  {SUPPORT_PRIORITY_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Assunto" required>
            <Input name="subject" required placeholder="Ex.: Dúvida sobre comissões" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Mensagem" required>
            <Textarea name="body" required placeholder="Conte o que aconteceu e o que você precisa." />
          </Field>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            Abrir ticket
          </Button>
        </div>
      </form>
    </div>
  );
}
