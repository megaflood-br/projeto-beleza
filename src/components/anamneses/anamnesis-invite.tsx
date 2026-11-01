"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, MessageCircle, X } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { createAnamnesisInvite } from "@/app/actions/anamnesis";
import { ANAMNESIS_AREA_LABEL } from "@/lib/anamnesis";
import type { AnamnesisFormRow } from "@/components/anamneses/types";

export function AnamnesisInviteButton({
  clientId,
  forms,
}: {
  clientId: string;
  forms: AnamnesisFormRow[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Link2 size={16} />
        Gerar link
      </Button>
      {open ? <AnamnesisInviteDialog clientId={clientId} forms={forms} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AnamnesisInviteDialog({
  clientId,
  forms,
  onClose,
}: {
  clientId: string;
  forms: AnamnesisFormRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const active = forms.filter((form) => form.active);
  const [formId, setFormId] = useState(active[0]?.id || "");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setError(null);
    setPending(true);
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("formId", formId);
    const result = await createAnamnesisInvite(formData);
    setPending(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (result && "url" in result) {
      setUrl(result.url || "");
      setMessage(result.message || "");
      setWhatsapp(result.whatsapp || "");
      router.refresh();
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Não foi possível copiar. Selecione o texto e copie.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-paper p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Link para a cliente</h2>
            <p className="mt-1 text-sm text-ink-soft">Ela preenche a ficha no celular, sem entrar no sistema.</p>
          </div>
          <button type="button" className="rounded-lg p-1.5 text-ink-soft hover:bg-sand" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Ficha">
            <SearchSelect
              options={active.map((form) => ({
                value: form.id,
                label: form.name,
                hint: ANAMNESIS_AREA_LABEL[form.area],
              }))}
              value={formId}
              onChange={(next) => {
                setFormId(next);
                setUrl("");
              }}
              placeholder="Selecionar ficha"
              required
            />
          </Field>
          {url ? (
            <div className="grid gap-2">
              <div className="rounded-xl border border-line bg-sand px-3 py-2 text-sm break-all">{url}</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void copy(url)}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copiado" : "Copiar link"}
                </Button>
                {whatsapp ? (
                  <a
                    href={`${whatsapp}?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-wine px-4 py-2 text-sm font-medium text-white"
                  >
                    <MessageCircle size={16} />
                    Enviar no WhatsApp
                  </a>
                ) : (
                  <Button type="button" variant="outline" onClick={() => void copy(message)}>
                    Copiar mensagem
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button type="button" disabled={pending || !formId} onClick={() => void generate()}>
            {pending ? "Gerando..." : url ? "Gerar de novo" : "Gerar link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
