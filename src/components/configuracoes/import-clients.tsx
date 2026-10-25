"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { clientImportTemplate, importClientsFromXls } from "@/app/actions/import-clients";
import { CLIENT_IMPORT_HEADERS } from "@/lib/client-import";

export function ImportClientsForm({ canImport }: { canImport: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: { row: number; message: string }[] } | null>(
    null,
  );

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
              const form = new FormData(event.currentTarget);
              setError(null);
              setResult(null);
              setPending(true);
              void importClientsFromXls(form)
                .then((outcome) => {
                  if (outcome && "error" in outcome && outcome.error) {
                    setError(outcome.error);
                    return;
                  }
                  if (outcome && "ok" in outcome && outcome.ok) {
                    setResult({
                      created: outcome.created,
                      updated: outcome.updated,
                      skipped: outcome.skipped,
                      errors: outcome.errors,
                    });
                  }
                })
                .finally(() => setPending(false));
            }}
          >
            <input
              name="file"
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="text-sm"
            />
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
