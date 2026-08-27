"use client";

import { useState } from "react";
import Link from "next/link";
import { CirclePlay, Pencil } from "lucide-react";
import { Card } from "@/components/ui";
import { TransactionDrawer } from "@/components/finance/transaction-drawer";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CatalogAccount, CatalogCategory, CatalogMethod } from "@/lib/finance-catalog";
import type { TransactionFormValue, TransactionListRow } from "@/components/finance/types";

export function FinanceTransactions({
  rows,
  professionals,
  suppliers,
  accounts,
  methods,
  categories,
}: {
  rows: TransactionListRow[];
  professionals: { id: string; name: string }[];
  suppliers: string[];
  accounts: CatalogAccount[];
  methods: CatalogMethod[];
  categories: CatalogCategory[];
}) {
  const [editing, setEditing] = useState<TransactionFormValue | null>(null);

  return (
    <>
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
                <th className="text-right font-medium">Valor</th>
                <th className="w-12 px-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  className={cn(
                    "border-t border-white/60",
                    t.type === "EXPENSE" ? "bg-rose-50/80" : "bg-emerald-50/80",
                  )}
                >
                  <td className="px-4 py-3 align-top whitespace-nowrap">{t.dateLabel}</td>
                  <td className="py-3 pr-3 align-top">
                    <div className="font-medium text-blue-700">{t.titular}</div>
                    {t.subtitle ? <div className="text-xs text-ink-soft">{t.subtitle}</div> : null}
                  </td>
                  <td className="py-3 align-top">
                    {t.originHref ? (
                      <Link href={t.originHref} className="text-blue-700 hover:underline">
                        {t.originLabel}
                      </Link>
                    ) : (
                      t.originLabel
                    )}
                  </td>
                  <td className="py-3 align-top">{t.methodLabel}</td>
                  <td className="py-3 align-top">
                    <div>{t.organizational ? "—" : t.accountLabel}</div>
                    <div className="text-xs text-ink-soft">{t.settled ? "Baixa automática" : "A receber"}</div>
                  </td>
                  <td className="py-3 align-top">{t.categoryLabel}</td>
                  <td
                    className={cn(
                      "py-3 text-right align-top font-medium whitespace-nowrap",
                      t.type === "EXPENSE" ? "text-rose-700" : "text-emerald-700",
                    )}
                  >
                    {t.type === "EXPENSE" ? "-" : "+"}
                    {formatBRL(t.amountCents)}
                    {t.feeCents ? <div className="text-xs font-normal text-ink-soft">líq. {formatBRL(t.netCents)}</div> : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                      aria-label="Editar transação"
                      onClick={() => setEditing(t.form)}
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {editing ? (
        <TransactionDrawer
          key={editing.id}
          type={editing.type}
          transaction={editing}
          showTrigger={false}
          professionals={professionals}
          suppliers={suppliers}
          accounts={accounts}
          methods={methods}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
