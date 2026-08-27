"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { saveFinanceAccount } from "@/app/actions/cadastros";
import { cn } from "@/lib/utils";
import type { AccountRow } from "@/components/cadastros/types";

export function AccountDrawer({
  open,
  account,
  onClose,
}: {
  open: boolean;
  account: AccountRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [adminOnly, setAdminOnly] = useState(account?.adminOnly ?? true);
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false);

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("adminOnly", adminOnly ? "1" : "");
    formData.set("isDefault", isDefault ? "1" : "");
    try {
      const result = await saveFinanceAccount(formData);
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
          <h2 className="text-lg font-semibold">{account ? "Editar conta" : "Nova conta"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {account ? <input type="hidden" name="id" value={account.id} /> : null}
          <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" required defaultValue={account?.name ?? ""} placeholder="Ex.: Caixa" />
            </Field>
            <Field label="Detalhes">
              <Input name="details" defaultValue={account?.details ?? ""} placeholder="Ex.: Somente para administrador" />
            </Field>
            <Toggle checked={adminOnly} onChange={setAdminOnly} label="Somente para administrador" />
            <Toggle checked={isDefault} onChange={setIsDefault} label="Conta padrão (caixa)" hint="Usada em dinheiro, comissões e quando a forma não tiver conta." />
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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-blue-600" : "bg-slate-300")}
      >
        <span className={cn("absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white transition", checked ? "translate-x-5" : "translate-x-0")} />
      </button>
    </div>
  );
}
