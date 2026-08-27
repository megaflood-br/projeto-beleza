import { Card } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AccountBalanceRow } from "@/lib/ledger";

export function AccountBalances({ rows }: { rows: AccountBalanceRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <Card key={row.accountId} className="py-4">
          <div className="text-xs text-ink-soft">{row.name}</div>
          <div
            className={cn(
              "font-display text-xl",
              row.settledCents < 0 ? "text-rose-700" : row.settledCents > 0 ? "text-emerald-700" : "",
            )}
          >
            {formatBRL(row.settledCents)}
          </div>
        </Card>
      ))}
    </div>
  );
}
