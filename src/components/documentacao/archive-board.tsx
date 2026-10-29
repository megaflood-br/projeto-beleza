"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { saveSalonDocument, deleteSalonDocument } from "@/app/actions/documents";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  DOCUMENTATION_TABS,
  DOCUMENT_KIND_LABEL,
  DOCUMENT_VALIDITY_LABEL,
  documentFileHref,
  documentValidity,
  type ArchiveTab,
  type DocumentKind,
} from "@/lib/documentation";
import { cn } from "@/lib/utils";

function brDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export type ArchiveDoc = {
  id: string;
  kind: DocumentKind;
  title: string;
  number: string;
  issuer: string;
  issuedAt: string | null;
  expiresAt: string | null;
  fileName: string;
  notes: string;
  professionalId: string | null;
  professionalName: string | null;
};

const VALIDITY_CLASS: Record<string, string> = {
  expired: "bg-red-100 text-red-800",
  expiring: "bg-amber-100 text-amber-900",
  valid: "bg-emerald-100 text-emerald-800",
  none: "bg-sand text-ink-soft",
};

export function ArchiveBoard({
  tab,
  canManage,
  documents,
  professionals,
}: {
  tab: ArchiveTab;
  canManage: boolean;
  documents: ArchiveDoc[];
  professionals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const meta = DOCUMENTATION_TABS.find((item) => item.id === tab);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showProfessional = tab === "certificado" || tab === "contrato" || professionals.length > 0;
  const placeholders =
    meta && "titlePlaceholder" in meta
      ? { title: meta.titlePlaceholder, number: meta.numberPlaceholder, issuer: meta.issuerPlaceholder }
      : { title: "Documento", number: "Número", issuer: "Emissor" };

  async function onSave(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const result = await saveSalonDocument(new FormData(form));
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onSave(event.currentTarget);
            }}
          >
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="kind" value={meta?.kind ?? "OUTRO"} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Título" required>
                <Input name="title" required placeholder={placeholders.title} />
              </Field>
              <Field label="Número">
                <Input name="number" placeholder={placeholders.number} />
              </Field>
              <Field label="Emissor">
                <Input name="issuer" placeholder={placeholders.issuer} />
              </Field>
              {showProfessional ? (
                <Field label={tab === "certificado" ? "Prestador" : "Prestador (opcional)"}>
                  <Select name="professionalId" defaultValue="">
                    <option value="">{tab === "certificado" ? "Selecione o prestador" : "Não vinculado"}</option>
                    {professionals.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Emissão">
                <Input name="issuedAt" type="date" />
              </Field>
              <Field label="Validade">
                <Input name="expiresAt" type="date" />
              </Field>
            </div>
            <Field label="Arquivo" required>
              <Input
                name="file"
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              />
              <span className="text-xs text-ink-soft">PDF ou imagem, até 7 MB.</span>
            </Field>
            <Field label="Observações">
              <Textarea name="notes" placeholder="Local da via original, protocolo, etc." />
            </Field>
            {error ? <p className="text-sm text-warn">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              <Upload size={16} />
              {busy ? "Enviando..." : "Arquivar documento"}
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-ink-soft">Somente administradores enviam e excluem documentos.</p>
      )}

      {documents.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-ink-soft">
          <FileText size={28} />
          <p>{meta && "empty" in meta ? meta.empty : "Nenhum documento arquivado ainda."}</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-paper">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_8rem_auto] gap-3 border-b border-line px-4 py-2.5 text-xs font-semibold tracking-wide text-ink-soft uppercase md:grid">
            <span>Documento</span>
            <span>Emissor / nº</span>
            <span>Emissão</span>
            <span>Validade</span>
            <span className="text-right">Arquivo</span>
          </div>
          <ul>
            {documents.map((doc) => {
              const validity = documentValidity(doc.expiresAt);
              return (
                <li
                  key={doc.id}
                  className="grid gap-2 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_8rem_auto] md:items-center md:gap-3"
                >
                  <div>
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-ink-soft">
                      {doc.professionalName ? doc.professionalName : DOCUMENT_KIND_LABEL[doc.kind]}
                      {doc.notes ? ` · ${doc.notes}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-ink-soft">
                    {doc.issuer || "—"}
                    {doc.number ? ` · ${doc.number}` : ""}
                  </div>
                  <div className="text-sm">{brDate(doc.issuedAt)}</div>
                  <div>
                    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", VALIDITY_CLASS[validity])}>
                      {doc.expiresAt ? `${DOCUMENT_VALIDITY_LABEL[validity]} · ${brDate(doc.expiresAt)}` : DOCUMENT_VALIDITY_LABEL.none}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <a
                      href={documentFileHref(doc.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-sand"
                    >
                      <FileText size={14} />
                      Abrir
                    </a>
                    <a
                      href={documentFileHref(doc.id, true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-sand"
                    >
                      <Download size={14} />
                      Baixar
                    </a>
                    {canManage ? (
                      <ConfirmDeleteButton
                        title={`Excluir ${doc.title}?`}
                        description="O arquivo sai do arquivo do salão."
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                        onConfirm={async () => {
                          const formData = new FormData();
                          formData.set("id", doc.id);
                          const result = await deleteSalonDocument(formData);
                          if (result && "error" in result && result.error) setError(result.error);
                        }}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </ConfirmDeleteButton>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
