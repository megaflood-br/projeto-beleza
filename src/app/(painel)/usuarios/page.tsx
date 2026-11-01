import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { UsersBoard } from "@/components/usuarios/users-board";
import { agendaScopeLabel, canManagePermissions, resolveAccess } from "@/lib/permissions";

export default async function UsuariosPage() {
  const { session, access } = await requireTenant();
  if (!canManageTeam(session.role) && !canManagePermissions(session.role, access)) {
    return (
      <div className="rounded-xl border border-line bg-paper p-8 text-sm text-ink-soft">
        Sem permissão para administrar usuários.
      </div>
    );
  }

  const [users, professionals] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: session.tenantId, role: { not: "SUPER_ADMIN" } },
      include: { professional: { select: { name: true } }, permissionProfile: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <UsersBoard
      currentUserId={session.userId}
      allowOwner={session.role === "OWNER"}
      professionals={professionals}
      users={users.map((user) => {
        const resolved = resolveAccess({
          role: user.role,
          professionalId: user.professionalId,
          profile: user.permissionProfile,
          accessJson: user.accessJson,
        });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          professionalId: user.professionalId,
          professionalName: user.professional?.name ?? null,
          permissionProfileId: user.permissionProfileId,
          accessLabel: resolved.custom ? "Personalizado" : resolved.profileName ?? "Padrão do cargo",
          agendaLabel: resolved.isAdmin ? "Agenda de todos" : agendaScopeLabel(resolved),
        };
      })}
    />
  );
}
