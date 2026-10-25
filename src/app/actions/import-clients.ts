"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { CLIENT_IMPORT_HEADERS, mapClientImportRows, toClientCreateData } from "@/lib/client-import";

const MAX_BYTES = 6 * 1024 * 1024;
const MAX_ROWS = 3000;

export async function importClientsFromXls(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para importar." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo .xls ou .xlsx." };
  if (file.size > MAX_BYTES) return { error: "Arquivo maior que 6 MB." };

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xls") && !name.endsWith(".xlsx")) {
    return { error: "Envie uma planilha .xls ou .xlsx." };
  }

  let table: unknown[][] = [];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { error: "A planilha não tem abas." };
    table = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
  } catch {
    return { error: "Não foi possível ler o arquivo. Confira se é um Excel válido." };
  }

  if (table.length > MAX_ROWS + 1) return { error: `A planilha tem mais de ${MAX_ROWS} linhas.` };

  const { drafts, errors } = mapClientImportRows(table);
  if (!drafts.length && !errors.length) return { error: "Nenhum cliente encontrado na planilha." };

  let created = 0;
  let updated = 0;
  const phones = drafts.map((draft) => draft.phone);
  const existing = await prisma.client.findMany({
    where: { tenantId: session.tenantId, phone: { in: phones } },
    select: { id: true, phone: true },
  });
  const byPhone = new Map(existing.map((row) => [row.phone, row.id]));

  for (const draft of drafts) {
    const data = toClientCreateData(draft, session.tenantId);
    const id = byPhone.get(draft.phone);
    try {
      if (id) {
        await prisma.client.update({
          where: { id },
          data: {
            name: data.name,
            phone: data.phone,
            landline: data.landline,
            email: data.email,
            notes: data.notes,
            tags: data.tags,
            cpf: data.cpf,
            rg: data.rg,
            birthDate: data.birthDate,
            address: data.address,
            addressNumber: data.addressNumber,
            district: data.district,
            city: data.city,
            state: data.state,
            creditCents: data.creditCents,
          },
        });
        updated += 1;
      } else {
        await prisma.client.create({ data });
        created += 1;
      }
    } catch {
      errors.push({ row: 0, message: `Falha ao salvar ${draft.name}.` });
    }
  }

  revalidatePath("/clientes");
  revalidatePath("/configuracoes");
  return { ok: true as const, created, updated, skipped: errors.length, errors: errors.slice(0, 30) };
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
