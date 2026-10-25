"use server";

import * as XLSX from "xlsx";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { CLIENT_IMPORT_HEADERS } from "@/lib/client-import";
import { runClientImport } from "@/lib/run-client-import";

export async function importClientsFromXls(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para importar." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Selecione um arquivo .xls ou .xlsx." };
  return runClientImport(file, session.tenantId);
}

export async function clientImportTemplate() {
  await requireTenant();
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...CLIENT_IMPORT_HEADERS],
    [
      "Ana Camila",
      "",
      "",
      "11961938720",
      "",
      "",
      "",
      "12/01/1990",
      "Rua Harmonia",
      "240",
      "Vila Madalena",
      "Atibaia",
      "São Paulo",
      "0",
      "09/05/2022",
      "vip",
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Clientes");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return {
    fileName: "modelo-clientes.xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: Buffer.from(bytes).toString("base64"),
  };
}
