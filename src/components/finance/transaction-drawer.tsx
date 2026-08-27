"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { saveTransaction } from "@/app/actions/finance";
import { calendarDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CatalogAccount, CatalogCategory, CatalogMethod } from "@/lib/finance-catalog";
import type { TransactionFormValue } from "@/components/finance/types";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function TransactionDrawer({
  type,
  transaction,
  professionals,
  suppliers,
  accounts,
  methods,
  categories,
  showTrigger = true,
  onClose,
}: {
  type: "INCOME" | "EXPENSE";
  transaction?: TransactionFormValue | null;
  professionals: { id: string; name: string }[];
  suppliers: string[];
  accounts: CatalogAccount[];
  methods: CatalogMethod[];
  categories: CatalogCategory[];
  showTrigger?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(transaction?.id);
  const [open, setOpen] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [organizational, setOrganizational] = useState(transaction?.organizational ?? false);
  const [adjustDates, setAdjustDates] = useState(Boolean(transaction?.competenceDate));
  const [recurring, setRecurring] = useState(Boolean(transaction?.recurrence));
  const isExpense = type === "EXPENSE";
  const typeCategories = categories.filter((c) => c.active && c.type === type);
  const defaultAccount =
    accounts.find((a) => a.id === transaction?.accountId) ??
    accounts.find((a) => a.isDefault && a.active) ??
    accounts.find((a) => a.active);
  const defaultMethod =
    methods.find((m) => m.id === transaction?.methodId) ??
    methods.find((m) => m.active && m.code === "PIX" && m.favorite) ??
    methods.find((m) => m.active && m.code === "PIX") ??
    methods.find((m) => m.active);

  function close() {
    setOpen(false);
    onClose?.();
  }

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("type", type);
    formData.set("organizational", organizational ? "1" : "");
    formData.set("recurrence", recurring ? String(formData.get("recurrence") ?? transaction?.recurrence ?? "MONTHLY") : "");
    try {
      const result = await saveTransaction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {showTrigger && !isEdit ? (
        <Button type="button" variant={isExpense ? "danger" : "success"} onClick={() => setOpen(true)}>
          <Plus size={16} />
          {isExpense ? "Nova despesa" : "Nova receita"}
        </Button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={close} />
          <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold">
                {isEdit ? (isExpense ? "Editar despesa" : "Editar receita") : isExpense ? "Nova despesa" : "Nova receita"}
              </h2>
              <button type="button" onClick={close} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
              {transaction?.id ? <input type="hidden" name="id" value={transaction.id} /> : null}
              <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-4">
                {isExpense ? (
                  <Toggle
                    checked={organizational}
                    onChange={setOrganizational}
                    label="É uma despesa organizacional?"
                    hint="Se ativo, não vincula a nenhum caixa."
                  />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Valor" required>
                    <Input
                      name="amount"
                      required
                      placeholder="R$ 0,00"
                      defaultValue={transaction ? centsToInput(transaction.amountCents) : ""}
                    />
                  </Field>
                  <Field label="Descrição">
                    <Input name="description" placeholder="Insira uma descrição (opcional)" defaultValue={transaction?.description ?? ""} />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Vencimento" required>
                    <Input name="dueDate" type="date" required defaultValue={transaction?.dueDate ?? calendarDate()} />
                  </Field>
                  <Field label="Forma de pagamento" required>
                    <SearchSelect
                      name="methodId"
                      required
                      placeholder="Forma de pagamento"
                      defaultValue={defaultMethod?.id}
                      options={methods.filter((m) => m.active).map((m) => ({ value: m.id, label: m.name, hint: m.accountName }))}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Conta" required>
                    <SearchSelect
                      name="accountId"
                      required={!organizational}
                      placeholder="Conta"
                      defaultValue={defaultAccount?.id}
                      options={accounts.filter((a) => a.active).map((a) => ({ value: a.id, label: a.name }))}
                    />
                  </Field>
                  <Field label="Categoria" required>
                    <SearchSelect
                      name="category"
                      required
                      placeholder={isExpense ? "Fornecedor" : "Categoria"}
                      defaultValue={transaction?.category}
                      options={typeCategories.map((c) => ({ value: c.slug, label: c.name }))}
                    />
                  </Field>
                </div>

                {isExpense ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Pago para fornecedor">
                      <Input name="supplier" placeholder="Fornecedor" list="supplier-list" defaultValue={transaction?.supplier ?? ""} />
                      <datalist id="supplier-list">
                        {suppliers.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </Field>
                    <Field label="Pago para profissional">
                      <SearchSelect
                        name="professionalId"
                        placeholder="Selecionar profissional"
                        emptyOption={{ value: "", label: "Nenhum" }}
                        defaultValue={transaction?.professionalId ?? ""}
                        options={professionals.map((p) => ({ value: p.id, label: p.name }))}
                      />
                    </Field>
                  </div>
                ) : null}

                {isExpense ? (
                  <Toggle
                    checked={adjustDates}
                    onChange={setAdjustDates}
                    label="Ajustar datas de competência e baixa"
                  />
                ) : null}
                {adjustDates ? (
                  <Field label="Data de competência">
                    <Input name="competenceDate" type="date" defaultValue={transaction?.competenceDate || calendarDate()} />
                  </Field>
                ) : null}

                <Toggle checked={recurring} onChange={setRecurring} label="Adicionar recorrência" />
                {recurring ? (
                  <Field label="Frequência">
                    <SearchSelect
                      name="recurrence"
                      defaultValue={transaction?.recurrence ?? "MONTHLY"}
                      options={[
                        { value: "WEEKLY", label: "Semanal" },
                        { value: "MONTHLY", label: "Mensal" },
                        { value: "YEARLY", label: "Anual" },
                      ]}
                    />
                  </Field>
                ) : null}

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
      ) : null}
    </>
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
