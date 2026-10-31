import { redirect } from "next/navigation";
import { getSession, homePath, isPlatformAdmin, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function scopedTenant<T extends { tenantId: string }>(tenantId: string, data: T): T {
  return { ...data, tenantId };
}

export { homePath };

export async function requireTenant() {
  const session = await requireSession();
  if (isPlatformAdmin(session.role) && !session.impersonatorId) {
    redirect("/plataforma");
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) redirect("/login");
  if (tenant.kind === "SUPPLIER") redirect("/fornecedor");
  if (tenant.kind === "PARTNER") redirect("/parceiro");
  if (tenant.status === "SUSPENDED" && !session.impersonatorId) {
    redirect("/login?suspended=1");
  }
  return { session, tenant };
}

export async function requireSupplier() {
  const session = await requireSession();
  if (isPlatformAdmin(session.role) && !session.impersonatorId) {
    redirect("/plataforma");
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant || tenant.kind !== "SUPPLIER") redirect("/dashboard");
  if (tenant.status === "SUSPENDED" && !session.impersonatorId) {
    redirect("/login?suspended=1");
  }
  return { session, tenant };
}

export async function requirePartner() {
  const session = await requireSession();
  if (isPlatformAdmin(session.role) && !session.impersonatorId) {
    redirect("/plataforma");
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant || tenant.kind !== "PARTNER") redirect("/dashboard");
  if (tenant.status === "SUSPENDED" && !session.impersonatorId) {
    redirect("/login?suspended=1");
  }
  const partner = await prisma.partner.findUnique({
    where: { tenantId: tenant.id },
    include: { brand: true },
  });
  if (!partner) redirect("/dashboard");
  return { session, tenant, partner };
}

export async function requirePlatformAdmin() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.role) || session.impersonatorId) {
    redirect(session.impersonatorId ? "/dashboard" : homePath(session.role));
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant?.isPlatform) redirect("/dashboard");
  return { session, tenant };
}
