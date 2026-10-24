"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { addManualCashback } from "@/app/actions/clients";
import { CASHBACK_TYPE_LABEL, centsToPoints, type CashbackType } from "@/lib/cashback";
import { formatBRL } from "@/lib/money";
import { formatMediumDate, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type CashbackMoveRow = {
  id: string;
  type: CashbackType;
  amountCents: number;
  points: number;
  reason: string | null;
  createdByName: string | null;
  createdAt: string;
};

export function CashbackTab({
  clientId,
  balanceCents,
  enabled,
  centsPerPoint,
  movements,
}: {
  clientId: string;
  balanceCents: number;
  enabled: boolean;
  centsPerPoint: number;
  movements: CashbackMoveRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const points = centsToPoints(balanceCents, centsPerPoint);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("clientId", clientId);
    try {
      const result = await addManualCashback(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-xl border border-line px-5 py-5">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Coins size={16} />
            Saldo de cashback
          </div>
          <div className="mt-1 text-3xl font-semibold">{formatBRL(balanceCents)}</div>
          <div className="mt-1 text-sm text-ink-soft">
            {points} ponto{points === 1 ? "" : "s"} · 1 ponto = {formatBRL(centsPerPoint)}
          </div>
        </div>
        {enabled ? (
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Adicionar pontos
          </Button>
        ) : (
          <p className="max-w-sm text-sm text-ink-soft">
            O módulo está desativado. Ative em Configurações para acumular e lançar pontos.
          </p>
        )}
      </div>

      {!movements.length ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-ink-soft">
          Sem movimentação de cashback.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="font-medium">Tipo</th>
                <th className="font-medium">Pontos</th>
                <th className="font-medium">Valor</th>
                <th className="px-4 font-medium">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-2.5 text-ink-soft">
                    {formatMediumDate(new Date(row.createdAt))} · {formatTime(new Date(row.createdAt))}
                  </td>
                  <td>{CASHBACK_TYPE_LABEL[row.type] ?? row.type}</td>
                  <td className={cn(row.points < 0 ? "text-red-600" : "text-emerald-700")}>
                    {row.points > 0 ? `+${row.points}` : row.points}
                  </td>
                  <td className={cn(row.amountCents < 0 ? "text-red-600" : "text-emerald-700")}>
                    {formatBRL(row.amountCents)}
                  </td>
                  <td className="px-4">
                    <div>{row.reason ?? "—"}</div>
                    {row.createdByName ? <div className="text-[11px] text-ink-soft">{row.createdByName}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
          <form action={submit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="font-display text-2xl">Adicionar pontos</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Use valor positivo para creditar e negativo para estornar. 1 ponto = {formatBRL(centsPerPoint)}.
            </p>
            <div className="mt-4 grid gap-3">
              <Field label="Pontos" required>
                <Input name="points" type="number" required placeholder="10" />
              </Field>
              <Field label="Motivo">
                <Textarea name="reason" placeholder="Bonificação, cortesia, correção..." />
              </Field>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Lançar pontos
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
