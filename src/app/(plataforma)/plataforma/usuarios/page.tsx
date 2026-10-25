import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { HqUsersBoard } from "@/components/plataforma/hq-users-board";

export default async function PlataformaUsuariosPage() {
  const { session, tenant } = await requirePlatformAdmin();
  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "SUPER_ADMIN" },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, active: true },
  });

  return <HqUsersBoard currentUserId={session.userId} users={users} />;
}
