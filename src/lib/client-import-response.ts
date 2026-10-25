export type ClientImportParsed = {
  error?: string;
  ok?: true;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
};

export function parseImportResponse(status: number, text: string): ClientImportParsed {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      error: "O servidor não respondeu. Abra Clientes e confira o total — parte da planilha pode ter sido gravada.",
    };
  }
  try {
    return JSON.parse(trimmed) as ClientImportParsed;
  } catch {
    if (status === 413) return { error: "Arquivo maior do que o servidor aceita." };
    if (status === 401 || status === 403) {
      return { error: "Sessão expirada ou sem permissão. Entre de novo e importe outra vez." };
    }
    if (status >= 500) {
      return { error: "O servidor interrompeu a importação. Abra Clientes e confira quantos já entraram." };
    }
    return { error: `Não foi possível ler a resposta da importação (HTTP ${status || "sem status"}).` };
  }
}
