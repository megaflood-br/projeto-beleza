import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { createTransaction } from "@/app/actions/finance";
import { formatBRL } from "@/lib/money";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/constants";
import { formatShortDate } from "@/lib/dates";
import { formAction } from "@/lib/utils";

export default async function FinanceiroPage() {
  const { session } = await requireTenant();
  const txs = await prisma.transaction.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { occurredAt: "desc" },
    take: 40,
  });
  const income = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const expense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <h1 className="font-display text-3xl">Financeiro</h1>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card>
            <div className="text-xs text-ink-soft">Entradas</div>
            <div className="font-display text-2xl">{formatBRL(income)}</div>
          </Card>
          <Card>
            <div className="text-xs text-ink-soft">Saídas</div>
            <div className="font-display text-2xl">{formatBRL(expense)}</div>
          </Card>
          <Card>
            <div className="text-xs text-ink-soft">Saldo da lista</div>
            <div className="font-display text-2xl">{formatBRL(income - expense)}</div>
          </Card>
        </div>
        <Card className="mt-4 p-0">
          <table className="w-full text-sm">
            <thead className="bg-sand text-left">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th>Descrição</th>
                <th>Método</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-4 py-2">{formatShortDate(t.occurredAt)}</td>
                  <td>{t.description ?? t.category}</td>
                  <td>{PAYMENT_LABEL[t.method as PaymentMethod] ?? t.method}</td>
                  <td className={t.type === "EXPENSE" ? "text-warn" : "text-success"}>
                    {t.type === "EXPENSE" ? "-" : "+"}
                    {formatBRL(t.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <Card>
        <h2 className="font-display text-2xl">Lançar</h2>
        <form action={formAction(createTransaction)} className="mt-4 grid gap-3">
          <Field label="Tipo">
            <Select name="type">
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </Select>
          </Field>
          <Field label="Categoria">
            <Input name="category" placeholder="servico, aluguel, fornecedor" />
          </Field>
          <Field label="Valor">
            <Input name="amount" placeholder="150,00" />
          </Field>
          <Field label="Método">
            <Select name="method">
              <option>PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="CREDIT">Crédito</option>
              <option value="DEBIT">Débito</option>
            </Select>
          </Field>
          <Field label="Descrição">
            <Input name="description" />
          </Field>
          <Button>Salvar lançamento</Button>
        </form>
      </Card>
    </div>
  );
}
