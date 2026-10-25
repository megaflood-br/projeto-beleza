"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge, Button, Card, Field, Select } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { cancelInvoiceAction, emitComandaInvoice } from "@/app/actions/fiscal";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import {
  FISCAL_KINDS,
  FISCAL_STATUS_COLOR,
  FISCAL_STATUS_LABEL,
  fiscalKindLabel,
  formatAccessKey,
  formatCnpj,
  isFiscalStatus,
} from "@/lib/fiscal";
import { hasContoraArtifacts } from "@/lib/contora";
import type { EmitComandaOption, InvoiceRow } from "@/components/notas/types";

export function InvoiceBoard({
  invoices,
  comandas,
  canManage,
  ready,
  issuerCnpj,
}: {
  invoices: InvoiceRow[];
  comandas: EmitComandaOption[];
  canManage: boolean;
  ready: boolean;
  issuerCnpj: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [comandaId, setComandaId] = useState(comandas[0]?.id ?? "");
  const [emitKind, setEmitKind] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const filtered = useMemo(
    () =>
      invoices.filter((row) => {
        if (status && row.status !== status) return false;
        if (kind && row.kind !== kind) return false;
        return true;
      }),
    [invoices, status, kind],
  );

  async function emit() {
    if (!comandaId) return;
    setError(null);
    setPending(true);
    const form = new FormData();
    form.set("comandaId", comandaId);
    if (emitKind) form.set("kind", emitKind);
    const result = await emitComandaInvoice(form);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function cancel(id: string) {
    setError(null);
    const form = new FormData();
    form.set("id", id);
    const result = await cancelInvoiceAction(form);
    if (result && "error" in result && result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Notas fiscais</h1>
          <p className="mt-1 text-sm text-ink-soft">
            NFS-e para serviços e NFC-e para produtos, a partir da comanda fechada.
            {issuerCnpj ? ` Emitente ${formatCnpj(issuerCnpj)}.` : ""}
          </p>
        </div>
        <Link href="/configuracoes?tab=fiscal" className="text-sm font-medium text-wine">
          Configuração fiscal
        </Link>
      </div>

      {!ready ? (
        <Card>
          <p className="text-sm text-ink-soft">
            Ative o módulo e informe um CNPJ válido em Configurações → Fiscal para começar a emitir.
          </p>
        </Card>
      ) : canManage ? (
        <Card className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <Field label="Comanda fechada">
            <SearchSelect
              name="comandaId"
              value={comandaId}
              onChange={setComandaId}
              placeholder="Buscar comanda..."
              options={comandas.map((comanda) => ({
                value: comanda.id,
                label: `#${comanda.number} · ${comanda.clientName}`,
                hint: formatBRL(comanda.totalCents),
              }))}
            />
          </Field>
          <Field label="Tipo">
            <Select value={emitKind} onChange={(event) => setEmitKind(event.target.value)}>
              <option value="">Automático</option>
              {FISCAL_KINDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="button" disabled={pending || !comandaId} onClick={() => void emit()}>
              <Plus size={16} />
              {pending ? "Emitindo..." : "Emitir"}
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-44">
          <option value="">Todos os status</option>
          {Object.entries(FISCAL_STATUS_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={kind} onChange={(event) => setKind(event.target.value)} className="w-52">
          <option value="">Todos os tipos</option>
          {FISCAL_KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-ink-soft">
            <FileText size={28} />
            <p>Nenhuma nota neste filtro.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {row.number ? `${row.series}-${String(row.number).padStart(3, "0")}` : "—"}
                    </div>
                    <div className="text-xs text-ink-soft">
                      {row.issuedAt ? formatShortDate(new Date(row.issuedAt)) : "—"}
                      {row.comandaNumber ? ` · C#${row.comandaNumber}` : ""}
                    </div>
                  </td>
                  <td>
                    <div>{row.clientName}</div>
                    <div className="text-xs text-ink-soft">{formatAccessKey(row.accessKey)}</div>
                  </td>
                  <td>{fiscalKindLabel(row.kind)}</td>
                  <td>
                    <div>{formatBRL(row.amountCents)}</div>
                    {row.taxCents ? <div className="text-xs text-ink-soft">ISS {formatBRL(row.taxCents)}</div> : null}
                  </td>
                  <td>
                    <Badge color={FISCAL_STATUS_COLOR[isFiscalStatus(row.status) ? row.status : "DRAFT"]}>
                      {isFiscalStatus(row.status) ? FISCAL_STATUS_LABEL[row.status] : row.status}
                    </Badge>
                    {row.environment === "homolog" ? (
                      <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-soft">homologação</div>
                    ) : null}
                    {row.errorMessage ? <div className="mt-1 text-xs text-red-600">{row.errorMessage}</div> : null}
                  </td>
                  <td className="px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {hasContoraArtifacts(row) ? (
                        <>
                          <a href={`/notas/${row.id}/arquivo?tipo=pdf`} className="text-sm font-medium text-wine">
                            PDF
                          </a>
                          <a href={`/notas/${row.id}/arquivo?tipo=xml`} className="text-sm font-medium text-wine">
                            XML
                          </a>
                        </>
                      ) : null}
                      <Link href={`/notas/${row.id}`} className="text-sm font-medium text-wine">
                        Ver
                      </Link>
                      {canManage && (row.status === "AUTHORIZED" || row.status === "REJECTED") ? (
                        <button type="button" className="text-sm text-red-600" onClick={() => void cancel(row.id)}>
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
