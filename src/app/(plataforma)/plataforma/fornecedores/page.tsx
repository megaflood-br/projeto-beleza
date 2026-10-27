import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { SupplierAccountsBoard } from "@/components/plataforma/supplier-accounts-board";
import { TENANT_STATUSES, type TenantStatus } from "@/lib/constants";
import type { SupplierAccountRow } from "@/components/plataforma/supplier-types";

function asStatus(value: string): TenantStatus {
  return TENANT_STATUSES.includes(value as TenantStatus) ? (value as TenantStatus) : "ACTIVE";
}

export default async function PlataformaFornecedoresPage() {
  await requirePlatformAdmin();
  const tenants = await prisma.tenant.findMany({
    where: { kind: "SUPPLIER", isPlatform: false },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { catalogProducts: true, ordersAsSupplier: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const accounts: SupplierAccountRow[] = tenants.map((tenant) => {
    const owner = tenant.users.find((user) => user.role === "SUPPLIER") ?? tenant.users[0];
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: asStatus(tenant.status),
      email: tenant.email,
      phone: tenant.phone,
      city: tenant.city,
      notes: tenant.notes,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      products: tenant._count.catalogProducts,
      orders: tenant._count.ordersAsSupplier,
    };
  });
  return <SupplierAccountsBoard accounts={accounts} />;
}
