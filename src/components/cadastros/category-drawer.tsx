"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { saveFinanceCategory } from "@/app/actions/cadastros";
import type { CategoryRow } from "@/components/cadastros/types";

export function CategoryDrawer({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: CategoryRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await saveFinanceCategory(formData);
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
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{category ? "Editar categoria" : "Nova categoria"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {category ? <input type="hidden" name="id" value={category.id} /> : null}
          <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" required defaultValue={category?.name ?? ""} placeholder="Ex.: Aluguel" />
            </Field>
            <Field label="Tipo" required>
              <Select name="type" defaultValue={category?.type ?? "INCOME"}>
                <option value="INCOME">Receita</option>
                <option value="EXPENSE">Despesa</option>
              </Select>
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
