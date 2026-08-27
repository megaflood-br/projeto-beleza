"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { savePaymentMethod } from "@/app/actions/cadastros";
import { PAYMENT_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AccountRow, MethodRow } from "@/components/cadastros/types";

const CODES = [
  ...Object.entries(PAYMENT_LABEL).map(([value, label]) => ({ value, label: `${label} (${value})` })),
  { value: "BOLETO", label: "Boleto (BOLETO)" },
  { value: "AMEX", label: "Amex (AMEX)" },
];

export function MethodDrawer({
  open,
  method,
  accounts,
  onClose,
}: {
  open: boolean;
  method: MethodRow | null;
  accounts: AccountRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [autoSettle, setAutoSettle] = useState(method?.autoSettle ?? true);
  const [favorite, setFavorite] = useState(method?.favorite ?? false);

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("autoSettle", autoSettle ? "1" : "");
    formData.set("favorite", favorite ? "1" : "");
    try {
      const result = await savePaymentMethod(formData);
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
          <h2 className="text-lg font-semibold">{method ? "Editar forma de pagamento" : "Nova forma de pagamento"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {method ? <input type="hidden" name="id" value={method.id} /> : null}
          <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" required defaultValue={method?.name ?? ""} placeholder="Ex.: CC Elo 1x" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Código" required>
                <SearchSelect name="code" required defaultValue={method?.code ?? "PIX"} options={CODES} placeholder="Código" />
              </Field>
              <Field label="Grupo">
                <Select name="group" defaultValue={method?.group ?? "OTHER"}>
                  <option value="CASH">Dinheiro</option>
                  <option value="CARD">Cartão</option>
                  <option value="OTHER">Outros</option>
                </Select>
              </Field>
            </div>
            <Field label="Conta" required>
              <SearchSelect
                name="accountId"
                required
                placeholder="Conta de destino"
                defaultValue={method?.accountId ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? ""}
                options={accounts.filter((a) => a.active).map((a) => ({ value: a.id, label: a.name }))}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Taxa (%)">
                <Input name="fee" defaultValue={method ? (method.feeBps / 100).toFixed(2).replace(".", ",") : "0,00"} />
              </Field>
              <Field label="Prazo de recebimento (dias)">
                <Input name="settlementDays" type="number" min={0} defaultValue={method?.settlementDays ?? 0} />
              </Field>
            </div>
            <Toggle checked={autoSettle} onChange={setAutoSettle} label="Baixa automática no financeiro" hint="Credita a conta ao fechar a comanda ou registrar a transação." />
            <Toggle checked={favorite} onChange={setFavorite} label="Favorita" hint="Usada quando o código (Pix, crédito…) aparece mais de uma vez." />
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
