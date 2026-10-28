"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveSupplierAccount } from "@/app/actions/platform-suppliers";
import { TENANT_STATUSES, TENANT_STATUS_LABEL } from "@/lib/constants";
import type { SupplierAccountRow } from "@/components/plataforma/supplier-types";

export function SupplierAccountDrawer({
  account,
  onClose,
}: {
  account?: SupplierAccountRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    if (account?.id) formData.set("id", account.id);
    try {
      const result = await saveSupplierAccount(formData);
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
            <h2 className="text-lg font-semibold">{account ? "Editar fornecedor" : "Novo fornecedor"}</h2>
            <p className="text-sm text-ink-soft">A empresa entra com e-mail e senha para publicar produtos.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Nome da empresa" required>
              <Input name="name" required defaultValue={account?.name ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone">
                <Input name="phone" defaultValue={account?.phone ?? ""} />
              </Field>
              <Field label="Cidade">
                <Input name="city" defaultValue={account?.city ?? ""} />
              </Field>
            </div>
            <Field label="E-mail da empresa">
              <Input name="email" type="email" defaultValue={account?.email ?? ""} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={account?.status ?? "ACTIVE"}>
                {TENANT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {TENANT_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observações">
              <Textarea name="notes" defaultValue={account?.notes ?? ""} />
            </Field>
            <div className="rounded-xl border border-line p-3">
              <div className="mb-2 text-sm font-medium">{account ? "Redefinir acesso" : "Acesso do responsável"}</div>
              <div className="grid gap-3">
                <Field label="Nome">
                  <Input name="ownerName" defaultValue={account?.ownerName ?? ""} required={!account} />
                </Field>
                <Field label="E-mail de login">
                  <Input name="ownerEmail" type="email" defaultValue={account?.ownerEmail ?? ""} required={!account} />
                </Field>
                <Field label={account ? "Nova senha (opcional)" : "Senha"} required={!account}>
                  <Input name="ownerPassword" type="password" minLength={account ? undefined : 6} required={!account} />
                </Field>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
