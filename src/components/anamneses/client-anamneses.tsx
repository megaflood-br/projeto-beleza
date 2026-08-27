"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { AnamnesisDrawer } from "@/components/anamneses/anamnesis-drawer";
import {
  ANAMNESIS_AREA_LABEL,
  ANAMNESIS_STATUS_COLOR,
  ANAMNESIS_STATUS_LABEL,
  type AnamnesisStatus,
} from "@/lib/anamnesis";
import { formatMediumDate, zonedDateTime } from "@/lib/dates";
import type { AnamnesisFormRow, AnamnesisRow } from "@/components/anamneses/types";

export function ClientAnamneses({
  client,
  records,
  forms,
  professionals,
}: {
  client: { id: string; name: string; phone: string };
  records: AnamnesisRow[];
  forms: AnamnesisFormRow[];
  professionals: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<AnamnesisRow | null | undefined>(undefined);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Anamneses</h2>
          <p className="text-sm text-ink-soft">Histórico de fichas de saúde deste cliente.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Nova anamnese
        </Button>
      </div>

      {!records.length ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-ink-soft">
          Nenhuma anamnese preenchida.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ficha</th>
                <th className="font-medium">Profissional</th>
                <th className="font-medium">Data</th>
                <th className="px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-2.5">
                    <button type="button" className="text-left font-medium text-wine" onClick={() => setEditing(row)}>
                      {row.formName}
                    </button>
                    <div className="text-xs text-ink-soft">{ANAMNESIS_AREA_LABEL[row.formArea]}</div>
                    {row.alerts.length ? (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                        <AlertTriangle size={12} />
                        {row.alerts.length} alerta{row.alerts.length > 1 ? "s" : ""}
                      </div>
                    ) : null}
                  </td>
                  <td>{row.professionalName ?? "—"}</td>
                  <td>{formatMediumDate(zonedDateTime(row.occurredAt, "12:00"))}</td>
                  <td className="px-4">
                    <Badge color={ANAMNESIS_STATUS_COLOR[row.status as AnamnesisStatus]}>
                      {ANAMNESIS_STATUS_LABEL[row.status as AnamnesisStatus]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined ? (
        <AnamnesisDrawer
          open
          record={editing}
          forms={forms}
          clients={[client]}
          professionals={professionals}
          lockedClientId={client.id}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}
