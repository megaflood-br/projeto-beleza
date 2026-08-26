import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card, Field, Input, Select } from "@/components/ui";
import { CreateModal } from "@/components/create-modal";
import { moveStock, upsertProduct } from "@/app/actions/inventory";
import { formatBRL } from "@/lib/money";
import { isLowStock } from "@/lib/stock";

export default async function EstoquePage() {
  const { session } = await requireTenant();
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    include: { moves: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Estoque</h1>
          <p className="text-ink-soft">Baixa automática ao concluir um atendimento que consome produto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateModal trigger="Novo produto" title="Novo produto" submitLabel="Salvar produto" action={upsertProduct}>
            <Field label="Nome">
              <Input name="name" required />
            </Field>
            <Field label="SKU">
              <Input name="sku" />
            </Field>
            <Field label="Estoque inicial">
              <Input name="stock" type="number" defaultValue={0} />
            </Field>
            <Field label="Estoque mínimo">
              <Input name="minStock" type="number" defaultValue={2} />
            </Field>
            <Field label="Custo">
              <Input name="cost" placeholder="28,00" />
            </Field>
            <Field label="Preço de venda">
              <Input name="sale" placeholder="89,00" />
            </Field>
          </CreateModal>
          <CreateModal trigger="Movimentar" title="Movimentar estoque" submitLabel="Registrar" action={moveStock}>
            <Field label="Produto">
              <Select name="productId">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select name="type">
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
                <option value="ADJUST">Ajuste (define saldo)</option>
              </Select>
            </Field>
            <Field label="Quantidade">
              <Input name="quantity" type="number" step="0.1" defaultValue={1} />
            </Field>
            <Field label="Motivo">
              <Input name="reason" placeholder="Compra, perda, uso..." />
            </Field>
          </CreateModal>
        </div>
      </div>
      <div className="grid gap-3">
        {products.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-ink-soft">
                SKU {p.sku ?? "—"} · custo {formatBRL(p.costCents)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl">{p.stock}</div>
              {isLowStock(p.stock, p.minStock) ? (
                <div className="text-xs text-warn">Abaixo do mínimo ({p.minStock})</div>
              ) : (
                <div className="text-xs text-ink-soft">mín. {p.minStock}</div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
