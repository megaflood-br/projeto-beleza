import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { parseDateParam, rangeOfDay } from "@/lib/dates";
import { AgendaBoard } from "@/components/agenda/board";
import type { AgendaAppointment, AgendaClient } from "@/components/agenda/types";
import type { AppointmentStatus } from "@/lib/constants";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  const params = await searchParams;
  const date = parseDateParam(typeof params.date === "string" ? params.date : null);
  const { start, end } = rangeOfDay(date);

  const [professionals, appointments, clients, services] = await Promise.all([
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: { tenantId: session.tenantId, startAt: { gte: start, lt: end } },
      include: { client: true, items: { include: { service: true } }, comanda: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.client.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
      include: {
        packages: { include: { package: true } },
        comandas: { where: { status: "OPEN" }, select: { id: true } },
      },
    }),
    prisma.service.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const mappedClients: AgendaClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    birthDate: c.birthDate?.toISOString() ?? null,
    creditCents: c.creditCents,
    cashbackCents: c.cashbackCents,
    openComandas: c.comandas.length,
    packages: c.packages.map((p) => ({
      name: p.package.name,
      remaining: p.remaining,
      priceCents: p.package.priceCents,
    })),
  }));

  const mapped: AgendaAppointment[] = appointments.map((a) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status as AppointmentStatus,
    notes: a.notes,
    professionalId: a.professionalId,
    comandaId: a.comanda?.id ?? null,
    client: { id: a.client.id, name: a.client.name, phone: a.client.phone },
    items: a.items.map((item) => ({
      serviceId: item.serviceId,
      professionalId: item.professionalId,
      startAt: item.startAt?.toISOString() ?? null,
      durationMin: item.durationMin,
      priceCents: item.priceCents,
      service: { name: item.service.name, color: item.service.color },
    })),
  }));

  return (
    <AgendaBoard
      date={date.toISOString().slice(0, 10)}
      openTime={tenant.openTime}
      closeTime={tenant.closeTime}
      slotMinutes={tenant.slotMinutes}
      professionals={professionals}
      appointments={mapped}
      clients={mappedClients}
      services={services}
    />
  );
}
