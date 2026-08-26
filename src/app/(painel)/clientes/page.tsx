import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { upsertClient } from "@/app/actions/clients";
import { formatBRL } from "@/lib/money";
import { formAction } from "@/lib/utils";
import Link from "next/link";

export default async function ClientesPage() {
  const { session } = await requireTenant();
  const clients = await prisma.client.findMany({
    where: { tenantId: session.tenantId },
    include: {
      appointments: { include: { items: true }, orderBy: { startAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <h1 className="font-display text-3xl">Clientes</h1>
        <p className="mb-4 text-ink-soft">CRM com histórico, tags e origem do agendamento.</p>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th>WhatsApp</th>
                <th>Tags</th>
                <th>Último serviço</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="font-medium text-wine">
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.phone}</td>
                  <td className="text-ink-soft">{c.tags || "—"}</td>
                  <td>
                    {c.appointments[0]
                      ? formatBRL(c.appointments[0].items.reduce((s, i) => s + i.priceCents, 0))
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card>
        <h2 className="font-display text-2xl">Novo cliente</h2>
        <form action={formAction(upsertClient)} className="mt-4 grid gap-3">
          <Field label="Nome">
            <Input name="name" required />
          </Field>
          <Field label="WhatsApp">
            <Input name="phone" required placeholder="11999999999" />
          </Field>
          <Field label="E-mail">
            <Input name="email" type="email" />
          </Field>
          <Field label="Instagram">
            <Input name="instagram" placeholder="@cliente" />
          </Field>
          <Field label="Tags">
            <Input name="tags" placeholder="vip, coloracao" />
          </Field>
          <Field label="Notas">
            <Textarea name="notes" />
          </Field>
          <Button>Salvar no CRM</Button>
        </form>
      </Card>
    </div>
  );
}
