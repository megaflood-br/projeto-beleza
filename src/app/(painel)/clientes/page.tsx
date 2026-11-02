import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { ClientBoard } from "@/components/clientes/client-board";
import { calendarDate } from "@/lib/dates";
import { shouldHidePhones } from "@/lib/permissions";
import { redactPhone } from "@/lib/utils";

export default async function ClientesPage() {
  const { session, access } = await requireTenant();
  const hidePhones = shouldHidePhones(access);
  const clients = await prisma.client.findMany({
    where: { tenantId: session.tenantId },
    include: {
      appointments: { include: { items: { include: { service: true } } }, orderBy: { startAt: "desc" }, take: 1 },
      comandas: { where: { status: "OPEN" }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  const tags = [
    ...new Set(
      clients.flatMap((c) =>
        c.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <ClientBoard
      tags={tags}
      hidePhones={hidePhones}
      clients={clients.map((c) => ({
        id: c.id,
        name: c.name,
        nickname: c.nickname,
        phone: redactPhone(c.phone, hidePhones),
        landline: hidePhones ? null : c.landline,
        email: c.email,
        birthDate: c.birthDate ? calendarDate(c.birthDate) : null,
        notes: c.notes,
        tags: c.tags,
        instagram: c.instagram,
        facebook: c.facebook,
        cnpj: c.cnpj,
        cpf: c.cpf,
        rg: c.rg,
        imageUrl: c.imageUrl,
        referredById: c.referredById,
        zip: c.zip,
        address: c.address,
        addressNumber: c.addressNumber,
        complement: c.complement,
        district: c.district,
        city: c.city,
        state: c.state,
        defaultDiscountPct: c.defaultDiscountPct,
        discountTarget: c.discountTarget,
        active: c.active,
        notifications: c.notifications,
        blockAccess: c.blockAccess,
        lastService: c.appointments[0]?.items.map((i) => i.service.name).join(", ") || null,
        hasDebt: c.comandas.length > 0,
        hasPhone: Boolean(c.phone),
      }))}
    />
  );
}
