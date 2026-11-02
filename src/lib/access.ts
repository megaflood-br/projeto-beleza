import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { resolveAccess, type Access } from "@/lib/permissions";

export async function loadAccess(session: Pick<SessionUser, "userId" | "role">): Promise<Access> {
  if (session.role === "SUPER_ADMIN") {
    return resolveAccess({ role: session.role });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        role: true,
        professionalId: true,
        accessJson: true,
        permissionProfile: { select: { id: true, name: true, isAdmin: true, grants: true } },
      },
    });
    if (!user) return resolveAccess({ role: session.role });
    return resolveAccess({
      role: user.role,
      professionalId: user.professionalId,
      profile: user.permissionProfile,
      accessJson: user.accessJson,
    });
  } catch {
    return resolveAccess({ role: session.role });
  }
}
