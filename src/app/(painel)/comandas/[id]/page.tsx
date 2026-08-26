import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { addComandaItem, closeComanda, removeComandaItemForm } from "@/app/actions/comandas";
import { formAction } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { comandaSubtotal, comandaTotal, itemLineTotal } from "@/lib/comandas";
import { COMANDA_STATUS_COLOR, COMANDA_STATUS_LABEL, PAYMENT_LABEL, type ComandaStatus, type PaymentMethod } from "@/lib/constants";
import { Trash2 } from "lucide-react";

export default async function ComandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await requireTenant();
  const { id } = await params;
  const [comanda, services, products, professionals] = await Promise.all([
    prisma.comanda.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { client: true, professional: true, appointment: true, items: { include: { professional: true } } },
    }),
    prisma.service.findMany({ where: { tenantId: session.tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { tenantId: session.tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.professional.findMany({ where: { tenantId: session.tenantId, active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!comanda) notFound();

  const open = comanda.status === "OPEN";
  const subtotal = comandaSubtotal(comanda.items);
  const total = comandaTotal({
    items: comanda.items,
    discountCents: comanda.discountCents,
    creditCents: comanda.creditCents,
    cashbackCents: comanda.cashbackCents,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">
            <Link href="/comandas" className="text-wine">
              Comandas
            </Link>
          </p>
          <h1 className="font-display text-3xl">Comanda #{comanda.number}</h1>
          <p className="text-ink-soft">
            {comanda.client.name} · {comanda.client.phone}
            {comanda.professional ? ` · ${comanda.professional.name}` : ""}
          </p>
        </div>
        <Badge color={COMANDA_STATUS_COLOR[comanda.status as ComandaStatus]}>
          {COMANDA_STATUS_LABEL[comanda.status as ComandaStatus]}
        </Badge>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-sand text-left">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th>Tipo</th>
              <th>Profissional</th>
              <th>Qtd</th>
              <th>Valor</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {comanda.items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-2">{item.description}</td>
                <td>{item.type === "SERVICE" ? "Serviço" : "Produto"}</td>
                <td>{item.professional?.name ?? "—"}</td>
                <td>{item.quantity}</td>
                <td>{formatBRL(itemLineTotal(item))}</td>
                <td>
                  {open ? (
                    <form action={formAction(removeComandaItemForm)}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button className="p-2 text-red-600" aria-label="Remover">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-xl">Adicionar serviço</h2>
            <form action={formAction(addComandaItem)} className="mt-3 grid gap-3">
              <input type="hidden" name="comandaId" value={comanda.id} />
              <input type="hidden" name="type" value="SERVICE" />
              <Field label="Serviço">
                <SearchSelect
                  name="serviceId"
                  required
                  placeholder="Buscar serviço..."
                  options={services.map((s) => ({
                    value: s.id,
                    label: s.name,
                    hint: formatBRL(s.priceCents),
                  }))}
                />
              </Field>
              <Field label="Profissional">
                <SearchSelect
                  name="professionalId"
                  placeholder="Buscar profissional..."
                  defaultValue={comanda.professionalId ?? ""}
                  options={professionals.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Field>
              <Button>Incluir serviço</Button>
            </form>
          </Card>
          <Card>
            <h2 className="font-display text-xl">Adicionar produto</h2>
            <form action={formAction(addComandaItem)} className="mt-3 grid gap-3">
              <input type="hidden" name="comandaId" value={comanda.id} />
              <input type="hidden" name="type" value="PRODUCT" />
              <Field label="Produto">
                <SearchSelect
                  name="productId"
                  required
                  placeholder="Buscar produto..."
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                    hint: formatBRL(p.saleCents),
                  }))}
                />
              </Field>
              <Field label="Quantidade">
                <Input name="quantity" type="number" min={1} defaultValue={1} />
              </Field>
              <Button>Incluir produto</Button>
            </form>
          </Card>
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="text-sm">
            <div>Subtotal {formatBRL(subtotal)}</div>
            {comanda.discountCents ? <div>Desconto {formatBRL(comanda.discountCents)}</div> : null}
            {comanda.creditCents ? <div>Crédito {formatBRL(comanda.creditCents)}</div> : null}
            {comanda.cashbackCents ? <div>Cashback {formatBRL(comanda.cashbackCents)}</div> : null}
            <div className="font-display text-3xl">{formatBRL(total)}</div>
          </div>
          {open ? (
            <form action={formAction(closeComanda)} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="comandaId" value={comanda.id} />
              <Field label="Desconto">
                <Input name="discount" defaultValue={(comanda.discountCents / 100).toFixed(2).replace(".", ",")} />
              </Field>
              <Field label="Pagamento">
                <Select name="method" defaultValue="PIX">
                  {Object.entries(PAYMENT_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="success">Fechar comanda</Button>
            </form>
          ) : (
            <p className="text-sm text-ink-soft">
              Paga via {PAYMENT_LABEL[comanda.paymentMethod as PaymentMethod] ?? comanda.paymentMethod}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
