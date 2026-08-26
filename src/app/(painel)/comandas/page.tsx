import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge, Card, Field } from "@/components/ui";
import { CreateModal } from "@/components/create-modal";
import { SearchSelect } from "@/components/search-select";
import { createWalkInComanda } from "@/app/actions/comandas";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Comandas</h1>
          <p className="text-ink-soft">Controle do atendimento, consumo e fechamento do caixa.</p>
        </div>
        <CreateModal
          trigger="Nova comanda"
          title="Nova comanda"
          description="Avulsa, sem agendamento. Pelo horário, use Criar comanda no modal da agenda."
          submitLabel="Abrir comanda"
          variant="success"
          action={createWalkInComanda}
        >
          <Field label="Cliente">
            <SearchSelect
              name="clientId"
              required
              placeholder="Buscar cliente..."
              options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone }))}
            />
          </Field>
          <Field label="Profissional">
            <SearchSelect
              name="professionalId"
              placeholder="Buscar profissional..."
              emptyOption={{ value: "", label: "Sem responsável" }}
              options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
        </CreateModal>
      </div>
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
  );
}
