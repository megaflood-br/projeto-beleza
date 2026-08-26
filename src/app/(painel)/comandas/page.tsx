import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge, Button, Card, Field, Select } from "@/components/ui";
import { createWalkInComanda } from "@/app/actions/comandas";
import { formAction } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { comandaTotal } from "@/lib/comandas";
import { COMANDA_STATUS_COLOR, COMANDA_STATUS_LABEL, type ComandaStatus } from "@/lib/constants";

export default async function ComandasPage() {
  const { session } = await requireTenant();
  const [comandas, clients, professionals] = await Promise.all([
    prisma.comanda.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, professional: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    prisma.professional.findMany({ where: { tenantId: session.tenantId, active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.7fr]">
      <div>
        <h1 className="font-display text-3xl">Comandas</h1>
        <p className="mb-4 text-ink-soft">Controle do atendimento, consumo e fechamento do caixa.</p>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nº</th>
                <th>Cliente</th>
                <th>Profissional</th>
                <th>Status</th>
                <th>Total</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/comandas/${c.id}`} className="font-medium text-wine">
                      #{c.number}
                    </Link>
                  </td>
                  <td>{c.client.name}</td>
                  <td>{c.professional?.name ?? "—"}</td>
                  <td>
                    <Badge color={COMANDA_STATUS_COLOR[c.status as ComandaStatus]}>
                      {COMANDA_STATUS_LABEL[c.status as ComandaStatus]}
                    </Badge>
                  </td>
                  <td>{formatBRL(comandaTotal({ items: c.items, discountCents: c.discountCents }))}</td>
                  <td>{formatShortDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card>
        <h2 className="font-display text-2xl">Nova comanda</h2>
        <p className="mt-1 text-sm text-ink-soft">Avulsa, sem agendamento. Pelo horário, use Criar comanda no modal.</p>
        <form action={formAction(createWalkInComanda)} className="mt-4 grid gap-3">
          <Field label="Cliente">
            <Select name="clientId" required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Profissional">
            <Select name="professionalId">
              <option value="">Sem responsável</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button>Abrir comanda</Button>
        </form>
      </Card>
    </div>
  );
}
