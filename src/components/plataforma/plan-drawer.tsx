"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { savePlatformPlan } from "@/app/actions/plans";
import { formatBRL } from "@/lib/money";
import { PLAN_INTERVALS, PLAN_INTERVAL_LABEL } from "@/lib/plans";
import type { PlatformPlanRow } from "@/components/plataforma/plan-types";

export function PlanDrawer({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan: PlatformPlanRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!open) return null;

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    if (plan?.id) formData.set("id", plan.id);
    try {
      const result = await savePlatformPlan(formData);
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
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{plan ? "Editar plano" : "Novo plano"}</h2>
            <p className="text-sm text-ink-soft">Tipo de plano oferecido aos salões da revenda.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" required defaultValue={plan?.name ?? ""} placeholder="Ex.: Profissional" />
            </Field>
            {!plan ? (
              <Field label="Slug">
                <Input name="slug" placeholder="profissional" />
              </Field>
            ) : (
              <p className="text-sm text-ink-soft">
                Identificador: <code>{plan.slug}</code>
              </p>
            )}
            <Field label="Descrição">
              <Textarea name="description" defaultValue={plan?.description ?? ""} placeholder="O que este plano inclui." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço" required>
                <Input name="price" defaultValue={plan ? formatBRL(plan.priceCents) : ""} placeholder="R$ 199,00" />
              </Field>
              <Field label="Cobrança">
                <Select name="interval" defaultValue={plan?.interval ?? "monthly"}>
                  {PLAN_INTERVALS.map((key) => (
                    <option key={key} value={key}>
                      {PLAN_INTERVAL_LABEL[key]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Dias de trial">
              <Input name="trialDays" type="number" min={0} defaultValue={plan?.trialDays ?? 14} />
            </Field>
            <Field label="Itens inclusos (um por linha)">
              <Textarea
                name="features"
                defaultValue={plan?.features.join("\n") ?? ""}
                placeholder={"Agenda e clientes\nComandas e caixa"}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="highlighted" value="1" defaultChecked={plan?.highlighted} />
              Destacar como mais popular
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" value="1" defaultChecked={plan?.isDefault} />
              Plano padrão do cadastro self-serve
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="hidden" name="active" value="0" />
              <input type="checkbox" name="active" value="1" defaultChecked={plan?.active ?? true} />
              Plano ativo para novas contas
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar plano"}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
