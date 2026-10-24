import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { PlatformBoard } from "@/components/plataforma/platform-board";
import { TENANT_PLANS, TENANT_STATUSES, type TenantPlan, type TenantStatus } from "@/lib/constants";
import type { TenantAccountRow } from "@/components/plataforma/types";

function asPlan(value: string): TenantPlan {
  return TENANT_PLANS.includes(value as TenantPlan) ? (value as TenantPlan) : "profissional";
}

function asStatus(value: string): TenantStatus {
  return TENANT_STATUSES.includes(value as TenantStatus) ? (value as TenantStatus) : "ACTIVE";
}

export default async function PlataformaPage() {
  await requirePlatformAdmin();
  const tenants = await prisma.tenant.findMany({
    where: { isPlatform: false },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { users: true, clients: true, appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const accounts: TenantAccountRow[] = tenants.map((tenant) => {
    const owner = tenant.users.find((user) => user.role === "OWNER") ?? tenant.users[0];
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: asPlan(tenant.plan),
      status: asStatus(tenant.status),
      email: tenant.email,
      phone: tenant.phone,
      city: tenant.city,
      notes: tenant.notes,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      users: tenant._count.users,
      clients: tenant._count.clients,
      appointments: tenant._count.appointments,
      createdAt: tenant.createdAt.toISOString(),
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    };
  });

  return <PlatformBoard accounts={accounts} />;
}
