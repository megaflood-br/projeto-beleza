"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveTenantAccount } from "@/app/actions/platform";
import { TENANT_PLANS, TENANT_PLAN_LABEL, TENANT_STATUSES, TENANT_STATUS_LABEL } from "@/lib/constants";
import type { TenantAccountRow } from "@/components/plataforma/types";

export function TenantDrawer({
  open,
  account,
  onClose,
}: {
  open: boolean;
  account: TenantAccountRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    if (account?.id) formData.set("id", account.id);
    try {
      const result = await saveTenantAccount(formData);
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
            <h2 className="text-lg font-semibold">{account ? "Editar conta" : "Nova conta"}</h2>
            <p className="text-sm text-ink-soft">Salão isolado, com agenda e CRM próprios.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Nome do salão" required>
              <Input name="name" defaultValue={account?.name ?? ""} required />
            </Field>
            {!account ? (
              <Field label="Slug (link /agendar)">
                <Input name="slug" placeholder="studio-aurora" />
              </Field>
            ) : (
              <p className="text-sm text-ink-soft">
                Link público: <code>/agendar/{account.slug}</code>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plano">
                <Select name="plan" defaultValue={account?.plan ?? "profissional"}>
                  {TENANT_PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {TENANT_PLAN_LABEL[plan]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={account?.status ?? "TRIAL"}>
                  {TENANT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TENANT_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                <Input name="phone" defaultValue={account?.phone ?? ""} />
              </Field>
              <Field label="Cidade">
                <Input name="city" defaultValue={account?.city ?? ""} />
              </Field>
            </div>
            <Field label="E-mail do salão">
              <Input name="email" type="email" defaultValue={account?.email ?? ""} />
            </Field>
            <Field label="Observações internas">
              <Textarea name="notes" defaultValue={account?.notes ?? ""} />
            </Field>

            <div className="rounded-xl border border-line p-3">
              <div className="mb-2 text-sm font-semibold">{account ? "Redefinir senha do dono" : "Proprietário"}</div>
              {!account ? (
                <>
                  <Field label="Nome do dono" required>
                    <Input name="ownerName" required />
                  </Field>
                  <div className="mt-2">
                    <Field label="E-mail de acesso" required>
                      <Input name="ownerEmail" type="email" required />
                    </Field>
                  </div>
                </>
              ) : (
                <p className="mb-2 text-sm text-ink-soft">
                  {account.ownerName ?? "Sem dono"} {account.ownerEmail ? `· ${account.ownerEmail}` : ""}
                </p>
              )}
              <div className="mt-2">
                <Field label={account ? "Nova senha (opcional)" : "Senha"} required={!account}>
                  <Input name="ownerPassword" type="password" minLength={account ? 0 : 6} />
                </Field>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar conta"}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
