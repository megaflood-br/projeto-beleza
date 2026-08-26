import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { formatShortDate, formatTime } from "@/lib/dates";
import { Card } from "@/components/ui";
import { notFound } from "next/navigation";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await requireTenant();
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      appointments: {
        include: { professional: true, items: { include: { service: true } } },
        orderBy: { startAt: "desc" },
      },
      packages: { include: { package: true } },
      conversations: { include: { messages: { orderBy: { createdAt: "desc" }, take: 3 } } },
    },
  });
  if (!client) notFound();

  const spent = client.appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.priceCents, 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">{client.name}</h1>
        <p className="text-ink-soft">
          {client.phone} · {client.email ?? "sem e-mail"} · origem {client.source}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-ink-soft">Lifetime value</div>
          <div className="font-display text-3xl">{formatBRL(spent)}</div>
        </Card>
        <Card>
          <div className="text-sm text-ink-soft">Atendimentos</div>
          <div className="font-display text-3xl">{client.appointments.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-ink-soft">Tags</div>
          <div className="mt-1">{client.tags || "—"}</div>
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-display text-2xl">Histórico</h2>
        <div className="space-y-2 text-sm">
          {client.appointments.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-line py-2">
              <div>
                {formatShortDate(a.startAt)} {formatTime(a.startAt)} · {a.items.map((i) => i.service.name).join(", ")}
                <div className="text-xs text-ink-soft">{a.professional.name}</div>
              </div>
              <div>
                {STATUS_LABEL[a.status as AppointmentStatus]} · {formatBRL(a.items.reduce((s, i) => s + i.priceCents, 0))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
