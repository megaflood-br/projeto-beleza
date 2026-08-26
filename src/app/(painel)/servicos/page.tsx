import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, Field, Input, Select } from "@/components/ui";
import { CreateModal } from "@/components/create-modal";
import { upsertService } from "@/app/actions/services";
import { formatBRL } from "@/lib/money";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Serviços e pacotes</h1>
          <p className="text-ink-soft">Tabela de preços, duração e comissão.</p>
        </div>
        <CreateModal trigger="Novo serviço" title="Novo serviço" submitLabel="Cadastrar" action={upsertService}>
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
        </CreateModal>
      </div>
      <div className="grid gap-3">
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
  );
}
