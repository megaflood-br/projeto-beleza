"use client";

import { useMemo, useState } from "react";
import { QrCode, ShieldCheck } from "lucide-react";
import { PrintButton } from "@/components/pops/print-button";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { saveSalonPop } from "@/app/actions/pops";
import { PopDocument, type PopDocumentModel } from "@/components/pops/pop-document";
import { popByKey, type SalonCompany } from "@/lib/pops";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export type PopRow = PopDocumentModel & {
  id: string;
  slug: string;
  templateKey: string;
  active: boolean;
  serviceId: string | null;
  qr: string;
  publicUrl: string;
};

export function PopBoard({
  company,
  pops,
  canManage,
}: {
  company: SalonCompany;
  pops: PopRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(pops[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = pops.find((row) => row.id === selectedId) ?? pops[0] ?? null;
  const template = selected ? popByKey(selected.templateKey) : null;
  const general = useMemo(() => pops.filter((row) => !row.serviceId), [pops]);
  const byService = useMemo(() => pops.filter((row) => row.serviceId), [pops]);

  async function onSave(formData: FormData) {
    if (!selected) return;
    setBusy(true);
    formData.set("id", selected.id);
    const result = await saveSalonPop(formData);
    setBusy(false);
    if (result && "error" in result && result.error) return;
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">POPs</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Procedimentos operacionais no padrão de vigilância sanitária. Os dados da empresa vêm do cadastro do salão. Cada POP tem
          impressão e QR individual.
        </p>
      </div>

      <Card className="text-sm text-ink-soft">
        <p className="font-medium text-ink">{company.legalName}</p>
        <p>
          {company.document ? `CNPJ ${company.document}` : "CNPJ não informado no cadastro fiscal."}
          {company.address || company.city ? ` · ${[company.address, company.city, company.uf].filter(Boolean).join(" · ")}` : ""}
        </p>
      </Card>

      {pops.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-ink-soft">
          <ShieldCheck size={28} />
          <p>Nenhum POP ainda. Recarregue a página para gerar a biblioteca do salão.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <PopList title="Biossegurança e ambiente" rows={general} selectedId={selected?.id} onSelect={setSelectedId} />
            <PopList title="Por serviço" rows={byService} selectedId={selected?.id} onSelect={setSelectedId} />
          </div>

          {selected && template ? (
            <div className="space-y-3">
              <div className="no-print flex flex-wrap gap-2">
                <PrintButton />
                <a
                  href={selected.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-paper px-4 py-2 text-sm font-medium hover:bg-sand"
                >
                  <QrCode size={16} />
                  Abrir QR / consulta
                </a>
                {canManage ? (
                  <Button type="button" variant="outline" onClick={() => setEditing((value) => !value)}>
                    {editing ? "Fechar edição" : "Responsável e produtos"}
                  </Button>
                ) : null}
              </div>

              {editing && canManage ? (
                <Card>
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void onSave(new FormData(event.currentTarget));
                    }}
                  >
                    <Field label="Responsável">
                      <Input name="responsible" defaultValue={selected.responsible} placeholder="Nome do responsável técnico ou do salão" />
                    </Field>
                    <Field label="Periodicidade">
                      <Input name="frequency" defaultValue={selected.frequency} />
                    </Field>
                    <Field label="Materiais e produtos usados neste salão">
                      <Textarea name="products" defaultValue={selected.products} />
                    </Field>
                    <Field label="Observações">
                      <Textarea name="notes" defaultValue={selected.notes} placeholder="Marca da autoclave, empresa de RSS, etc." />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" value="1" defaultChecked={selected.active} />
                      Ativo no painel
                    </label>
                    <Button type="submit" disabled={busy}>
                      {busy ? "Salvando..." : "Salvar revisão"}
                    </Button>
                  </form>
                </Card>
              ) : null}

              <PopDocument company={company} pop={selected} template={template} qr={selected.qr} publicUrl={selected.publicUrl} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PopList({
  title,
  rows,
  selectedId,
  onSelect,
}: {
  title: string;
  rows: PopRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <Card className="p-0">
      <div className="border-b border-line px-4 py-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">{title}</div>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onSelect(row.id)}
          className={cn(
            "block w-full border-b border-line px-4 py-3 text-left last:border-0",
            selectedId === row.id ? "bg-sand" : "hover:bg-sand/60",
            !row.active && "opacity-60",
          )}
        >
          <div className="truncate text-sm font-medium">{row.title}</div>
          <div className="text-xs text-ink-soft">
            {row.code} · rev. {row.revision}
            {row.serviceName ? ` · ${row.serviceName}` : ""}
          </div>
        </button>
      ))}
    </Card>
  );
}
