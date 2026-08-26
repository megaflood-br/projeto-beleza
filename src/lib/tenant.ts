import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function scopedTenant<T extends { tenantId: string }>(tenantId: string, data: T): T {
  return { ...data, tenantId };
}

export async function requireTenant() {
  const session = await requireSession();
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) redirect("/login");
  return { session, tenant };
}
