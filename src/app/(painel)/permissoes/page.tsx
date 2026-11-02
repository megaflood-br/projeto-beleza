import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManagePermissions } from "@/lib/permissions";
import { PermissionsBoard } from "@/components/permissoes/permissions-board";

export default async function PermissoesPage() {
  const { session, access } = await requireTenant();
  if (!canManagePermissions(session.role, access)) {
    return (
      <div className="rounded-xl border border-line bg-paper p-8 text-sm text-ink-soft">
        Sem permissão para personalizar acessos.
      </div>
    );
  }

  const [profiles, users] = await Promise.all([
    prisma.permissionProfile.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
    prisma.user.findMany({
      where: { tenantId: session.tenantId, role: { not: "SUPER_ADMIN" } },
      include: { professional: { select: { name: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <PermissionsBoard
      profiles={profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        isAdmin: profile.isAdmin,
        grants: profile.grants,
        userCount: profile._count.users,
      }))}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        professionalId: user.professionalId,
        professionalName: user.professional?.name ?? null,
        permissionProfileId: user.permissionProfileId,
        accessJson: user.accessJson,
      }))}
    />
  );
}
