import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { upsertService } from "@/app/actions/services";
import { formatBRL } from "@/lib/money";
import { formAction } from "@/lib/utils";

export default async function ServicosPage() {
  const { session } = await requireTenant();
  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: session.tenantId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceCategory.findMany({ where: { tenantId: session.tenantId } }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <h1 className="font-display text-3xl">Serviços e pacotes</h1>
        <div className="mt-4 grid gap-3">
          {services.map((s) => (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-ink-soft">
                  {s.category?.name} · {s.durationMin} min
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl">{formatBRL(s.priceCents)}</div>
                <div className="text-xs text-ink-soft">{s.active ? "Ativo" : "Inativo"}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Card>
        <h2 className="font-display text-2xl">Novo serviço</h2>
        <form action={formAction(upsertService)} className="mt-4 grid gap-3">
          <Field label="Nome">
            <Input name="name" required />
          </Field>
          <Field label="Categoria">
            <Select name="categoryId">
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duração (min)">
            <Input name="durationMin" type="number" defaultValue={60} />
          </Field>
          <Field label="Preço">
            <Input name="price" placeholder="120,00" />
          </Field>
          <Field label="Comissão % (opcional)">
            <Input name="commissionPct" type="number" />
          </Field>
          <Button>Cadastrar</Button>
        </form>
      </Card>
    </div>
  );
}
