"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shield } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { HqUserDrawer } from "@/components/plataforma/hq-user-drawer";
import { setPlatformUserActive } from "@/app/actions/platform-users";
import type { PlatformAdminRow } from "@/components/plataforma/hq-user-types";

export function HqUsersBoard({
  users,
  currentUserId,
}: {
  users: PlatformAdminRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlatformAdminRow | null | undefined>(undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Administradores</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Quem opera a plataforma MegaBeauty. Os usuários dos salões ficam no painel de cada conta.
          </p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo administrador
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-ink-soft">
            <Shield size={28} />
            <p>Nenhum administrador cadastrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3">Administrador</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-ink-soft">{user.email}</div>
                  </td>
                  <td>
                    <Badge color={user.active ? "#059669" : "#64748b"}>{user.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="text-sm font-medium text-wine" onClick={() => setEditing(user)}>
                        Editar
                      </button>
                      {user.id !== currentUserId ? (
                        <button
                          type="button"
                          className="text-sm text-ink-soft"
                          onClick={() => {
                            const form = new FormData();
                            form.set("id", user.id);
                            form.set("active", user.active ? "0" : "1");
                            void setPlatformUserActive(form).then(() => router.refresh());
                          }}
                        >
                          {user.active ? "Desativar" : "Ativar"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing !== undefined ? (
        <HqUserDrawer open user={editing} onClose={() => setEditing(undefined)} />
      ) : null}
    </div>
  );
}
