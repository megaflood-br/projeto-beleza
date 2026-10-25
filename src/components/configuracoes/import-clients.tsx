"use client";

import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { clientImportTemplate } from "@/app/actions/import-clients";
import { CLIENT_IMPORT_HEADERS } from "@/lib/client-import";

type ImportResult = { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] };

function uploadSpreadsheet(form: FormData, onProgress: (percent: number) => void) {
  return new Promise<ImportResult & { error?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/clientes/importar");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.max(8, Math.min(80, Math.round((event.loaded / event.total) * 70) + 8)));
    };
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText) as ImportResult & { error?: string });
      } catch {
        reject(new Error("Não foi possível ler a resposta da importação."));
      }
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar a planilha."));
    xhr.send(form);
  });
}

export function ImportClientsForm({ canImport }: { canImport: boolean }) {
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 92 ? current : current + Math.max(1, Math.round((92 - current) / 10))));
    }, 220);
    return () => window.clearInterval(timer);
  }, [pending]);

  async function downloadTemplate() {
    const file = await clientImportTemplate();
    const bytes = Uint8Array.from(atob(file.base64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: file.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-medium">Planilha de clientes</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Envie um arquivo .xls ou .xlsx com a primeira linha de títulos. Celular repetido atualiza o cadastro existente.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
            <Download size={16} />
            Baixar modelo
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs text-ink-soft">
            <thead>
              <tr>
                {CLIENT_IMPORT_HEADERS.map((header) => (
                  <th key={header} className="border-b border-line py-2 pr-3 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </Card>

      <Card>
        {canImport ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const started = Date.now();
              const form = new FormData(event.currentTarget);
              setError(null);
              setResult(null);
              setPending(true);
              setProgress(8);
              void uploadSpreadsheet(form, setProgress)
                .then((outcome) => {
                  if (outcome.error) {
                    setError(outcome.error);
                    return;
                  }
                  setProgress(100);
                  setResult({
                    created: outcome.created,
                    updated: outcome.updated,
                    skipped: outcome.skipped,
                    errors: outcome.errors ?? [],
                  });
                })
                .catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : "Não foi possível importar a planilha.");
                })
                .finally(() => {
                  setProgress(100);
                  const wait = Math.max(700, 1100 - (Date.now() - started));
                  window.setTimeout(() => {
                    setPending(false);
                    setProgress(0);
                  }, wait);
                });
            }}
          >
            <input
              name="file"
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              disabled={pending}
              className="text-sm"
            />
            {pending ? (
              <div className="rounded-xl border border-line bg-sand/60 p-3" aria-live="polite">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Importando planilha…</span>
                  <span className="tabular-nums text-ink-soft">{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-xs text-ink-soft">Enviando o arquivo e gravando os clientes. Aguarde.</p>
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              <Upload size={16} />
              {pending ? "Importando..." : "Importar clientes"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-ink-soft">Somente proprietário ou gerente pode importar a planilha.</p>
        )}
      </Card>

      {result ? (
        <Card>
          <h2 className="font-medium">Resultado</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {result.created} novos · {result.updated} atualizados · {result.skipped} ignorados
          </p>
          {result.errors.length ? (
            <ul className="mt-3 space-y-1 text-sm text-red-700">
              {result.errors.map((item, index) => (
                <li key={`${item.row}-${index}`}>
                  {item.row ? `Linha ${item.row}: ` : ""}
                  {item.message}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
