import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { TransactionDrawer } from "@/components/finance/transaction-drawer";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { financeAccountLabel, financeCategoryLabel, financeMethodLabel, financeOrigin, financeSubtitle, financeTitular } from "@/lib/finance";
import { loadFinanceCatalog } from "@/lib/finance-catalog";
import { accountBalanceDelta } from "@/lib/ledger";
import { CirclePlay } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function FinanceiroPage() {
  const { session } = await requireTenant();
  const [txs, professionals, catalog] = await Promise.all([
    prisma.transaction.findMany({
      where: { tenantId: session.tenantId },
      include: {
        professional: true,
        comanda: { include: { client: true } },
        appointment: { include: { client: true } },
        financeAccount: true,
        paymentMethodConfig: true,
        financeCategory: true,
      },
      orderBy: { occurredAt: "desc" },
      take: 80,
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadFinanceCatalog(session.tenantId),
  ]);
  const income = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const expense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  const suppliers = [...new Set(txs.map((t) => t.supplier).filter((name): name is string => Boolean(name)))];
  const balances = catalog.accounts
    .filter((a) => a.active)
    .map((account) => {
      const related = txs.filter((t) => t.accountId === account.id);
      const settled = related.reduce((sum, t) => sum + accountBalanceDelta({ type: t.type, netCents: t.netCents || t.amountCents, settled: t.settled }), 0);
      const pending = related.filter((t) => !t.settled && t.type === "INCOME").reduce((sum, t) => sum + (t.netCents || t.amountCents), 0);
      return { ...account, settled, pending };
    })
    .filter((a) => a.settled !== 0 || a.pending !== 0 || a.isDefault);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Financeiro</h1>
          <p className="text-ink-soft">Entradas, saídas e saldo do salão.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TransactionDrawer
            type="INCOME"
            professionals={professionals}
            suppliers={suppliers}
            accounts={catalog.accounts}
            methods={catalog.methods}
            categories={catalog.categories}
          />
          <TransactionDrawer
            type="EXPENSE"
            professionals={professionals}
            suppliers={suppliers}
            accounts={catalog.accounts}
            methods={catalog.methods}
            categories={catalog.categories}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-ink-soft">Entradas</div>
          <div className="font-display text-2xl text-emerald-700">{formatBRL(income)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">Saídas</div>
          <div className="font-display text-2xl text-rose-700">{formatBRL(expense)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft">Saldo da lista</div>
          <div className="font-display text-2xl">{formatBRL(income - expense)}</div>
        </Card>
      </div>

      {balances.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map((account) => (
            <Card key={account.id} className="py-4">
              <div className="text-xs text-ink-soft">{account.name}</div>
              <div className="font-display text-xl">{formatBRL(account.settled)}</div>
              {account.pending ? (
                <div className="text-xs text-ink-soft">A receber {formatBRL(account.pending)}</div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="font-semibold">Transações</h2>
          <CirclePlay size={14} className="text-ink-soft" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="font-medium">Titular</th>
                <th className="font-medium">Origem</th>
                <th className="font-medium">Forma de pagamento</th>
                <th className="font-medium">Conta</th>
                <th className="font-medium">Categoria</th>
                <th className="px-4 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => {
                const origin = financeOrigin(t);
                const subtitle = financeSubtitle(t);
                const net = t.netCents || t.amountCents;
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-t border-white/60",
                      t.type === "EXPENSE" ? "bg-rose-50/80" : "bg-emerald-50/80",
                    )}
                  >
                    <td className="px-4 py-3 align-top whitespace-nowrap">{formatShortDate(t.occurredAt)}</td>
                    <td className="py-3 pr-3 align-top">
                      <div className="font-medium text-blue-700">{financeTitular(t)}</div>
                      {subtitle ? <div className="text-xs text-ink-soft">{subtitle}</div> : null}
                    </td>
                    <td className="py-3 align-top">
                      {origin.href ? (
                        <Link href={origin.href} className="text-blue-700 hover:underline">
                          {origin.label}
                        </Link>
                      ) : (
                        origin.label
                      )}
                    </td>
                    <td className="py-3 align-top">{financeMethodLabel(t.method, t.paymentMethodConfig?.name)}</td>
                    <td className="py-3 align-top">
                      <div>{t.organizational ? "—" : financeAccountLabel(t.account, t.financeAccount?.name)}</div>
                      <div className="text-xs text-ink-soft">
                        {t.settled ? "Baixa automática" : "A receber"}
                      </div>
                    </td>
                    <td className="py-3 align-top">{financeCategoryLabel(t.category, t.financeCategory?.name)}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right align-top font-medium whitespace-nowrap",
                        t.type === "EXPENSE" ? "text-rose-700" : "text-emerald-700",
                      )}
                    >
                      {t.type === "EXPENSE" ? "-" : "+"}
                      {formatBRL(t.amountCents)}
                      {t.feeCents ? (
                        <div className="text-xs font-normal text-ink-soft">
                          líq. {formatBRL(net)}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
