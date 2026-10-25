"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { saveTenantUser } from "@/app/actions/users";
import { ROLE_LABEL } from "@/lib/constants";
import { TENANT_ROLES, type TenantRole } from "@/lib/users";
import type { TenantUserRow } from "@/components/usuarios/types";

export function UserDrawer({
  open,
  user,
  professionals,
  allowOwner,
  onClose,
}: {
  open: boolean;
  user: TenantUserRow | null;
  professionals: { id: string; name: string }[];
  allowOwner: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const roles = TENANT_ROLES.filter((role) => allowOwner || role !== "OWNER");

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await saveTenantUser(formData);
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
      <aside data-drawer="user" className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{user ? "Editar usuário" : "Novo usuário"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {user ? <input type="hidden" name="id" value={user.id} /> : null}
          <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" required defaultValue={user?.name ?? ""} placeholder="Marina Costa" />
            </Field>
            <Field label="E-mail" required>
              <Input name="email" type="email" required defaultValue={user?.email ?? ""} placeholder="yuki.t@example.com" />
            </Field>
            <Field label="Perfil" required>
              <Select name="role" defaultValue={(user?.role as TenantRole) ?? "RECEPTIONIST"}>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Profissional vinculado">
              <Select name="professionalId" defaultValue={user?.professionalId ?? ""}>
                <option value="">Nenhum</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={user ? "Nova senha (opcional)" : "Senha"} required={!user}>
              <Input
                name="password"
                type="password"
                minLength={user ? undefined : 6}
                required={!user}
                placeholder={user ? "Deixe em branco para manter" : "mínimo 6 caracteres"}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" value="1" defaultChecked={user?.active ?? true} />
              Usuário ativo
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
