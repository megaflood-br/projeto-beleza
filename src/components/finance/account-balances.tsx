import Link from "next/link";
import { CirclePlay } from "lucide-react";
import { Card } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AccountBalanceRow } from "@/lib/ledger";

export function AccountBalances({ rows }: { rows: AccountBalanceRow[] }) {
  const totalSettled = rows.reduce((sum, row) => sum + row.settledCents, 0);
  const totalPending = rows.reduce((sum, row) => sum + row.pendingCents, 0);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Saldos das contas</h2>
          <CirclePlay size={14} className="text-ink-soft" />
        </div>
        <Link href="/cadastros" className="text-sm text-blue-700 hover:underline">
          Gerenciar contas e formas
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-soft">
          Cadastre contas e vincule-as às formas de pagamento para ver os saldos aqui.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="font-medium">Formas de pagamento</th>
                <th className="text-right font-medium">Entradas</th>
                <th className="text-right font-medium">Saídas</th>
                <th className="text-right font-medium">A receber</th>
                <th className="px-4 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.accountId} className="border-t border-line">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{row.name}</div>
                    {row.isDefault ? <div className="text-xs text-ink-soft">Conta padrão</div> : null}
                  </td>
                  <td className="max-w-xs py-3 align-top text-ink-soft">
                    {row.methodNames.length ? row.methodNames.join(", ") : "—"}
                  </td>
                  <td className="py-3 text-right align-top text-emerald-700">{formatBRL(row.incomeCents)}</td>
                  <td className="py-3 text-right align-top text-rose-700">{formatBRL(row.expenseCents)}</td>
                  <td className="py-3 text-right align-top text-ink-soft">{formatBRL(row.pendingCents)}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right align-top font-semibold whitespace-nowrap",
                      row.settledCents < 0 ? "text-rose-700" : row.settledCents > 0 ? "text-emerald-700" : "text-ink",
                    )}
                  >
                    {formatBRL(row.settledCents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-slate-50 text-sm font-medium">
                <td className="px-4 py-3" colSpan={4}>
                  Total nas contas
                </td>
                <td className="py-3 text-right text-ink-soft">{formatBRL(totalPending)}</td>
                <td className={cn("px-4 py-3 text-right", totalSettled < 0 ? "text-rose-700" : "text-emerald-700")}>
                  {formatBRL(totalSettled)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
