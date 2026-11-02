"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shield, X } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { PermissionMatrix } from "@/components/permissoes/permission-matrix";
import { deletePermissionProfile, savePermissionProfile, saveUserAccess } from "@/app/actions/permissions";
import {
  agendaScopeLabel,
  phonesScopeLabel,
  allGrants,
  parseStoredAccess,
  profilePreset,
  resolveAccess,
  roleDefaultGrants,
  serializeAccess,
  type PermissionGrants,
} from "@/lib/permissions";
import { ROLE_LABEL, type Role } from "@/lib/constants";

export type PermissionProfileRow = {
  id: string;
  name: string;
  isAdmin: boolean;
  grants: string;
  userCount: number;
};

export type PermissionUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  professionalId: string | null;
  professionalName: string | null;
  permissionProfileId: string | null;
  accessJson: string | null;
};

export function PermissionsBoard({
  profiles,
  users,
}: {
  profiles: PermissionProfileRow[];
  users: PermissionUserRow[];
}) {
  const router = useRouter();
  const [editingProfile, setEditingProfile] = useState<PermissionProfileRow | null | undefined>(undefined);
  const [editingUser, setEditingUser] = useState<PermissionUserRow | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Permissões</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Defina o que cada profissional vê no painel. A agenda pode ser só a dela ou a de todo o salão. Os telefones das clientes também podem ficar ocultos.
          </p>
        </div>
        <Button type="button" onClick={() => setEditingProfile(null)}>
          <Plus size={16} />
          Novo perfil
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold">Perfis de acesso</h2>
        </div>
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-ink-soft">
            <Shield size={28} />
            <p>Nenhum perfil criado. Use o padrão do cargo ou crie um perfil, por exemplo “Profissional”.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3">Perfil</th>
                <th>Agenda</th>
                <th>Telefones</th>
                <th>Usuários</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const access = resolveAccess({
                  role: profile.isAdmin ? "OWNER" : "PROFESSIONAL",
                  profile: { id: profile.id, name: profile.name, isAdmin: profile.isAdmin, grants: profile.grants },
                });
                return (
                  <tr key={profile.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{profile.name}</td>
                    <td>{access.isAdmin ? "Agenda de todos" : agendaScopeLabel(access)}</td>
                    <td>{access.isAdmin ? "Telefones visíveis" : phonesScopeLabel(access)}</td>
                    <td>{profile.userCount}</td>
                    <td className="px-4 text-right">
                      <button type="button" className="text-sm font-medium text-wine" onClick={() => setEditingProfile(profile)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold">Acesso de cada usuário</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-sand text-left text-ink-soft">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th>Cargo</th>
              <th>Perfil</th>
              <th>Agenda</th>
              <th>Telefones</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const profile = profiles.find((item) => item.id === user.permissionProfileId) ?? null;
              const access = resolveAccess({
                role: user.role,
                professionalId: user.professionalId,
                profile: profile
                  ? { id: profile.id, name: profile.name, isAdmin: profile.isAdmin, grants: profile.grants }
                  : null,
                accessJson: user.accessJson,
              });
              return (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-ink-soft">
                      {user.professionalName ? `Profissional: ${user.professionalName}` : user.email}
                    </div>
                  </td>
                  <td>{ROLE_LABEL[user.role as Role] ?? user.role}</td>
                  <td>
                    <Badge color={access.custom ? "#0f172a" : access.isAdmin ? "#059669" : "#64748b"}>
                      {access.custom ? "Personalizado" : access.profileName ?? "Padrão do cargo"}
                    </Badge>
                  </td>
                  <td>{access.isAdmin ? "Agenda de todos" : agendaScopeLabel(access)}</td>
                  <td>{access.isAdmin ? "Telefones visíveis" : phonesScopeLabel(access)}</td>
                  <td className="px-4 text-right">
                    <button type="button" className="text-sm font-medium text-wine" onClick={() => setEditingUser(user)}>
                      Definir acesso
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {editingProfile !== undefined ? (
        <ProfileDrawer
          profile={editingProfile}
          onClose={() => setEditingProfile(undefined)}
          onSaved={() => {
            setEditingProfile(undefined);
            router.refresh();
          }}
        />
      ) : null}

      {editingUser ? (
        <UserAccessDrawer
          user={editingUser}
          profiles={profiles}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ProfileDrawer({
  profile,
  onClose,
  onSaved,
}: {
  profile: PermissionProfileRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = profile
    ? parseStoredAccess(profile.grants)
    : profilePreset("professional");
  const [name, setName] = useState(profile?.name ?? "");
  const [admin, setAdmin] = useState(profile?.isAdmin ?? initial.admin === true);
  const [grants, setGrants] = useState<PermissionGrants>(initial.modules ?? allGrants());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setPending(true);
    setError(null);
    const form = new FormData();
    if (profile) form.set("id", profile.id);
    form.set("name", name);
    form.set("admin", admin ? "1" : "0");
    form.set("grants", serializeAccess({ admin, modules: grants }));
    const result = await savePermissionProfile(form);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Drawer title={profile ? "Editar perfil" : "Novo perfil"} onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Nome do perfil" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Profissional, Recepção..." />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => {
            const next = profilePreset("professional");
            setAdmin(false);
            setGrants(next.modules ?? {});
          }}>
            Modelo profissional
          </Button>
          <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => {
            const next = profilePreset("reception");
            setAdmin(false);
            setGrants(next.modules ?? {});
          }}>
            Modelo recepção
          </Button>
          <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => {
            const next = profilePreset("manager");
            setAdmin(false);
            setGrants(next.modules ?? {});
          }}>
            Modelo gerente
          </Button>
        </div>
        <PermissionMatrix grants={grants} admin={admin} onAdmin={setAdmin} onChange={setGrants} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
      <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        {profile ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const form = new FormData();
              form.set("id", profile.id);
              void deletePermissionProfile(form).then(onSaved);
            }}
          >
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? "Salvando..." : "Salvar perfil"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function UserAccessDrawer({
  user,
  profiles,
  onClose,
  onSaved,
}: {
  user: PermissionUserRow;
  profiles: PermissionProfileRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const current = useMemo(() => {
    const profile = profiles.find((item) => item.id === user.permissionProfileId) ?? null;
    return resolveAccess({
      role: user.role,
      professionalId: user.professionalId,
      profile: profile
        ? { id: profile.id, name: profile.name, isAdmin: profile.isAdmin, grants: profile.grants }
        : null,
      accessJson: user.accessJson,
    });
  }, [profiles, user]);

  const [mode, setMode] = useState<"role" | "profile" | "custom">(
    user.accessJson ? "custom" : user.permissionProfileId ? "profile" : "role",
  );
  const [profileId, setProfileId] = useState(user.permissionProfileId ?? "");
  const [admin, setAdmin] = useState(current.isAdmin);
  const [grants, setGrants] = useState<PermissionGrants>(current.grants);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function applyRoleDefault() {
    const stored = roleDefaultGrants(user.role);
    setAdmin(stored.admin === true);
    setGrants(stored.modules ?? {});
  }

  async function onSubmit() {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("userId", user.id);
    form.set("mode", mode);
    form.set("profileId", profileId);
    form.set("admin", admin ? "1" : "0");
    form.set("grants", serializeAccess({ admin, modules: grants }));
    const result = await saveUserAccess(form);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Drawer title={`Acesso de ${user.name}`} onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Perfil de acesso">
          <Select
            value={mode === "role" ? "role" : mode === "profile" ? `profile:${profileId}` : "custom"}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "role") {
                setMode("role");
                applyRoleDefault();
                return;
              }
              if (value === "custom") {
                setMode("custom");
                return;
              }
              const id = value.replace("profile:", "");
              setMode("profile");
              setProfileId(id);
              const profile = profiles.find((item) => item.id === id);
              if (profile) {
                const stored = parseStoredAccess(profile.grants);
                setAdmin(profile.isAdmin);
                setGrants(stored.modules ?? {});
              }
            }}
          >
            <option value="role">Padrão do cargo ({ROLE_LABEL[user.role as Role] ?? user.role})</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={`profile:${profile.id}`}>
                {profile.name}
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </Select>
        </Field>
        {mode === "custom" || mode === "profile" ? (
          <PermissionMatrix
            grants={grants}
            admin={admin}
            disabled={mode === "profile"}
            onAdmin={(value) => {
              setMode("custom");
              setAdmin(value);
            }}
            onChange={(next) => {
              setMode("custom");
              setGrants(next);
            }}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            {current.isAdmin
              ? "Este cargo já tem acesso total."
              : `Padrão: ${agendaScopeLabel(current)}. ${phonesScopeLabel(current)}. Crie um perfil ou personalize para mudar.`}
          </p>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Drawer>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
