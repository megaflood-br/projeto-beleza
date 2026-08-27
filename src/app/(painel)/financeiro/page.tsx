import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { TransactionDrawer } from "@/components/finance/transaction-drawer";
import { AccountBalances } from "@/components/finance/account-balances";
import { FinanceTransactions } from "@/components/finance/finance-transactions";
import { formatBRL } from "@/lib/money";
import { calendarDate, formatShortDate } from "@/lib/dates";
import { financeAccountLabel, financeCategoryLabel, financeMethodLabel, financeOrigin, financeSubtitle, financeTitular } from "@/lib/finance";
import { loadFinanceCatalog } from "@/lib/finance-catalog";
import { summarizeAccountBalances } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import type { TransactionListRow } from "@/components/finance/types";

export default async function FinanceiroPage() {
  const { session } = await requireTenant();
  const [txs, ledgerRows, professionals, catalog] = await Promise.all([
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
    prisma.transaction.findMany({
      where: { tenantId: session.tenantId, organizational: false },
      select: {
        accountId: true,
        type: true,
        settled: true,
        netCents: true,
        amountCents: true,
        feeCents: true,
      },
    }),
    prisma.professional.findMany({
      where: { tenantId: session.tenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadFinanceCatalog(session.tenantId),
  ]);
  const balances = summarizeAccountBalances({
    accounts: catalog.accounts,
    methods: catalog.methods,
    transactions: ledgerRows,
  });
  const income = balances.reduce((sum, row) => sum + row.incomeCents, 0);
  const expense = balances.reduce((sum, row) => sum + row.expenseCents, 0);
  const saldo = balances.reduce((sum, row) => sum + row.settledCents, 0);
  const suppliers = [...new Set(txs.map((t) => t.supplier).filter((name): name is string => Boolean(name)))];
  const rows: TransactionListRow[] = txs.map((t) => {
    const origin = financeOrigin(t);
    return {
      id: t.id,
      type: t.type === "EXPENSE" ? "EXPENSE" : "INCOME",
      dateLabel: formatShortDate(t.occurredAt),
      titular: financeTitular(t),
      subtitle: financeSubtitle(t),
      originLabel: origin.label,
      originHref: origin.href,
      methodLabel: financeMethodLabel(t.method, t.paymentMethodConfig?.name),
      accountLabel: financeAccountLabel(t.account, t.financeAccount?.name),
      settled: t.settled,
      organizational: t.organizational,
      categoryLabel: financeCategoryLabel(t.category, t.financeCategory?.name),
      amountCents: t.amountCents,
      feeCents: t.feeCents,
      netCents: t.netCents || t.amountCents,
      form: {
        id: t.id,
        type: t.type === "EXPENSE" ? "EXPENSE" : "INCOME",
        category: t.category,
        amountCents: t.amountCents,
        methodId: t.paymentMethodId,
        method: t.method,
        accountId: t.accountId,
        description: t.description,
        organizational: t.organizational,
        supplier: t.supplier,
        professionalId: t.professionalId,
        recurrence: t.recurrence,
        dueDate: calendarDate(t.occurredAt),
        competenceDate: t.competenceAt ? calendarDate(t.competenceAt) : "",
      },
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Financeiro</h1>
          <p className="text-ink-soft">Saldo das contas vinculadas às formas de pagamento.</p>
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
          <div className="text-xs text-ink-soft">Saldo nas contas</div>
          <div className={cn("font-display text-2xl", saldo < 0 ? "text-rose-700" : "")}>{formatBRL(saldo)}</div>
        </Card>
      </div>

      <AccountBalances rows={balances} />

      <FinanceTransactions
        rows={rows}
        professionals={professionals}
        suppliers={suppliers}
        accounts={catalog.accounts}
        methods={catalog.methods}
        categories={catalog.categories}
      />
    </div>
  );
}
