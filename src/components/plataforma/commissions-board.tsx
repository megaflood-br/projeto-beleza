"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adjustPartnerCommission, payPartnerPayout } from "@/app/actions/platform-commissions";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { COMMISSION_STATUS_LABEL, COMMISSION_TYPE_LABEL } from "@/lib/partners";

export type AdminCommissionRow = {
  id: string;
  partnerName: string;
  partnerId: string;
  tenantName: string;
  type: string;
  status: string;
  commissionCents: number;
  createdAt: string;
};

export function CommissionsBoard({
  partners,
  rows,
}: {
  partners: { id: string; name: string; availableCents: number }[];
  rows: AdminCommissionRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: (formData: FormData) => Promise<{ error?: string } | { ok: true }>, formData: FormData) {
    setBusy(true);
    setError(null);
    const result = await action(formData);
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Comissões</h1>
        <p className="mt-1 text-sm text-ink-soft">Baixa de repasse, bônus e descontos no saldo do parceiro.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(payPartnerPayout, new FormData(event.currentTarget));
            }}
          >
            <div className="text-sm font-medium">Dar baixa no disponível</div>
            <Field label="Parceiro">
              <Select name="partnerId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} · {formatBRL(partner.availableCents)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observação">
              <Input name="note" placeholder="Comprovante Pix #..." />
            </Field>
            <Button disabled={busy}>Marcar como pago</Button>
          </form>
        </Card>
        <Card>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(adjustPartnerCommission, new FormData(event.currentTarget));
            }}
          >
            <div className="text-sm font-medium">Ajuste manual</div>
            <Field label="Parceiro">
              <Select name="partnerId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor (use negativo para descontar)">
              <Input name="amount" placeholder="150,00" />
            </Field>
            <Field label="Motivo">
              <Input name="note" placeholder="Bônus de campanha" />
            </Field>
            <Button disabled={busy} variant="outline">
              Lançar ajuste
            </Button>
          </form>
        </Card>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhuma comissão gerada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Quando</th>
                <th className="font-medium">Parceiro</th>
                <th className="font-medium">Salão</th>
                <th className="font-medium">Tipo</th>
                <th className="font-medium">Status</th>
                <th className="px-4 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3 text-ink-soft">{row.createdAt}</td>
                  <td>{row.partnerName}</td>
                  <td>{row.tenantName}</td>
                  <td>{COMMISSION_TYPE_LABEL[row.type as keyof typeof COMMISSION_TYPE_LABEL] ?? row.type}</td>
                  <td>{COMMISSION_STATUS_LABEL[row.status as keyof typeof COMMISSION_STATUS_LABEL] ?? row.status}</td>
                  <td className="px-4">{formatBRL(row.commissionCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
