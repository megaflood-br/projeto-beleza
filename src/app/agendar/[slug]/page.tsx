import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookingWizard } from "@/components/booking-wizard";
import { addDays } from "date-fns";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      services: { where: { active: true } },
      professionals: {
        where: { active: true },
        include: { serviceLinks: true },
      },
    },
  });
  if (!tenant) notFound();

  const busy = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      status: { notIn: ["CANCELLED"] },
      startAt: { gte: new Date(), lt: addDays(new Date(), 14) },
    },
    select: { professionalId: true, startAt: true, endAt: true },
  });

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-gold">Agendamento online</p>
      <h1 className="font-display text-4xl">{tenant.name}</h1>
      <p className="mt-2 text-ink-soft">{tenant.city ?? "Escolha serviço, profissional e horário."}</p>
      <div className="mt-8">
        <BookingWizard
          slug={tenant.slug}
          salon={tenant.name}
          openTime={tenant.openTime}
          closeTime={tenant.closeTime}
          slotMinutes={tenant.slotMinutes}
          services={tenant.services}
          professionals={tenant.professionals.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            serviceIds: p.serviceLinks.map((l) => l.serviceId),
          }))}
          busy={busy.map((b) => ({
            professionalId: b.professionalId,
            startAt: b.startAt.toISOString(),
            endAt: b.endAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
