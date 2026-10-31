"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { savePartnerAccount } from "@/app/actions/platform-partners";
import { PARTNER_STATUSES, PARTNER_STATUS_LABEL, commissionBpsToPercent } from "@/lib/partners";
import type { PartnerAccountRow } from "@/components/plataforma/partner-types";

export function PartnerDrawer({
  account,
  onClose,
}: {
  account?: PartnerAccountRow | null;
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
      const result = await savePartnerAccount(formData);
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
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{account ? "Editar parceiro" : "Novo parceiro"}</h2>
            <p className="text-sm text-ink-soft">O logo que ele configura é o do sistema, não o do salão.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Nome do parceiro" required>
              <Input name="name" required defaultValue={account?.name ?? ""} />
            </Field>
            <Field label="Slug do link" required>
              <Input name="slug" required defaultValue={account?.slug ?? ""} placeholder="ana-silva" />
            </Field>
            <Field label="Nome da marca do sistema">
              <Input name="brandName" defaultValue={account?.brandName ?? ""} />
            </Field>
            <Field label="Cor primária do sistema">
              <Input name="primary" type="color" defaultValue={account?.primary ?? "#ff0447"} className="h-11 w-14 cursor-pointer p-1" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Comissão %">
                <Input name="commissionPercent" type="number" min={0} max={80} step="0.5" defaultValue={account ? commissionBpsToPercent(account.commissionBps) : 20} />
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={account?.status ?? "PENDING"}>
                  {PARTNER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {PARTNER_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Responsável" required={!account}>
              <Input name="ownerName" defaultValue={account?.ownerName ?? ""} required={!account} />
            </Field>
            <Field label="E-mail de acesso" required={!account}>
              <Input name="ownerEmail" type="email" defaultValue={account?.ownerEmail ?? ""} required={!account} disabled={Boolean(account)} />
            </Field>
            <Field label={account ? "Nova senha (opcional)" : "Senha"} required={!account}>
              <Input name="ownerPassword" type="password" minLength={account ? undefined : 6} required={!account} />
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="border-t border-line px-5 py-4">
            <Button className="w-full" disabled={pending}>
              {pending ? "Salvando..." : "Salvar parceiro"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
