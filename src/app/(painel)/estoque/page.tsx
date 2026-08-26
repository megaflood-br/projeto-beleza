import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { moveStock, upsertProduct } from "@/app/actions/inventory";
import { formatBRL } from "@/lib/money";
import { isLowStock } from "@/lib/stock";
import { formAction } from "@/lib/utils";

export default async function EstoquePage() {
  const { session } = await requireTenant();
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    include: { moves: { orderBy: { createdAt: "desc" }, take: 3 } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <h1 className="font-display text-3xl">Estoque</h1>
        <p className="mb-4 text-ink-soft">Baixa automática ao concluir um atendimento que consome produto.</p>
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
      <div className="space-y-4">
        <Card>
          <h2 className="font-display text-2xl">Produto</h2>
          <form action={formAction(upsertProduct)} className="mt-4 grid gap-3">
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
            <Button>Salvar produto</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Movimentar</h2>
          <form action={formAction(moveStock)} className="mt-4 grid gap-3">
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
            <Button>Registrar</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
