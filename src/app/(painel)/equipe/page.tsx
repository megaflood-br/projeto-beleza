import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { TeamBoard } from "@/components/equipe/team-board";
import { calendarDate } from "@/lib/dates";

export default async function EquipePage() {
  const { session } = await requireTenant();
  const [professionals, services] = await Promise.all([
    prisma.professional.findMany({
      where: { tenantId: session.tenantId },
      include: { user: true, serviceLinks: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.service.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <TeamBoard
      services={services}
      professionals={professionals.map((p) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        color: p.color,
        phone: p.phone,
        specialty: p.specialty,
        commissionPct: p.commissionPct,
        active: p.active,
        workStart: p.workStart,
        workEnd: p.workEnd,
        imageUrl: p.imageUrl,
        birthDate: p.birthDate ? calendarDate(p.birthDate) : null,
        document: p.document,
        rg: p.rg,
        notes: p.notes,
        zip: p.zip,
        address: p.address,
        addressNumber: p.addressNumber,
        complement: p.complement,
        district: p.district,
        city: p.city,
        state: p.state,
        onlineBooking: p.onlineBooking,
        generateAgenda: p.generateAgenda,
        receivesCommission: p.receivesCommission,
        isStockist: p.isStockist,
        salonPartner: p.salonPartner,
        sortOrder: p.sortOrder,
        user: p.user ? { id: p.user.id, email: p.user.email, role: p.user.role, name: p.user.name } : null,
        serviceIds: p.serviceLinks.map((link) => link.serviceId),
      }))}
    />
  );
}
