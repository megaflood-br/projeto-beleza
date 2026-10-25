import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { compactImportTable, mapClientImportRows, toClientCreateData } from "@/lib/client-import";

export const CLIENT_IMPORT_MAX_BYTES = 8 * 1024 * 1024;
export const CLIENT_IMPORT_MAX_ROWS = 20000;

const FIND_CHUNK = 400;
const WRITE_CHUNK = 40;

export type ClientImportOutcome =
  | { error: string }
  | { ok: true; created: number; updated: number; skipped: number; total: number; errors: { row: number; message: string }[] };

function chunkItems<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

function trimSheetUsedRange(sheet: XLSX.WorkSheet) {
  const keys = Object.keys(sheet).filter((key) => !key.startsWith("!"));
  if (!keys.length) {
    sheet["!ref"] = "A1";
    return;
  }
  const cells = keys.map((key) => XLSX.utils.decode_cell(key));
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: Math.min(...cells.map((cell) => cell.r)), c: Math.min(...cells.map((cell) => cell.c)) },
    e: { r: Math.max(...cells.map((cell) => cell.r)), c: Math.max(...cells.map((cell) => cell.c)) },
  });
}

export async function runClientImport(file: File, tenantId: string): Promise<ClientImportOutcome> {
  if (file.size === 0) return { error: "Selecione um arquivo .xls ou .xlsx." };
  if (file.size > CLIENT_IMPORT_MAX_BYTES) return { error: "Arquivo maior que 8 MB." };

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
    trimSheetUsedRange(sheet);
    table = compactImportTable(
      XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: false }) as unknown[][],
    );
  } catch {
    return { error: "Não foi possível ler o arquivo. Confira se é um Excel válido." };
  }

  const dataRows = Math.max(0, table.length - 1);
  if (dataRows > CLIENT_IMPORT_MAX_ROWS) {
    return { error: `A planilha tem ${dataRows} clientes. O limite é ${CLIENT_IMPORT_MAX_ROWS}.` };
  }

  const { drafts, errors } = mapClientImportRows(table);
  if (!drafts.length && !errors.length) return { error: "Nenhum cliente encontrado na planilha." };

  const phones = drafts.map((draft) => draft.phone);
  const byPhone = new Map<string, string>();
  for (const group of chunkItems(phones, FIND_CHUNK)) {
    const existing = await prisma.client.findMany({
      where: { tenantId, phone: { in: group } },
      select: { id: true, phone: true },
    });
    for (const row of existing) byPhone.set(row.phone, row.id);
  }

  const toCreate: ReturnType<typeof toClientCreateData>[] = [];
  const toUpdate: { id: string; data: Omit<ReturnType<typeof toClientCreateData>, "tenantId" | "source" | "createdAt"> }[] = [];

  for (const draft of drafts) {
    let data: ReturnType<typeof toClientCreateData>;
    try {
      data = toClientCreateData(draft, tenantId);
    } catch {
      errors.push({ row: 0, message: `Data inválida em ${draft.name}.` });
      continue;
    }
    const id = byPhone.get(draft.phone);
    if (id) {
      toUpdate.push({
        id,
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
    } else {
      toCreate.push(data);
    }
  }

  let created = 0;
  let updated = 0;

  for (const group of chunkItems(toCreate, WRITE_CHUNK)) {
    try {
      const written = await prisma.client.createMany({
        data: group.map((row) =>
          Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)),
        ) as typeof group,
      });
      created += written.count;
    } catch {
      for (const data of group) {
        try {
          await prisma.client.create({ data });
          created += 1;
        } catch {
          errors.push({ row: 0, message: `Falha ao salvar ${data.name}.` });
        }
      }
    }
  }

  for (const group of chunkItems(toUpdate, WRITE_CHUNK)) {
    try {
      await prisma.$transaction(group.map(({ id, data }) => prisma.client.update({ where: { id }, data })));
      updated += group.length;
    } catch {
      for (const item of group) {
        try {
          await prisma.client.update({ where: { id: item.id }, data: item.data });
          updated += 1;
        } catch {
          errors.push({ row: 0, message: `Falha ao atualizar ${item.data.name}.` });
        }
      }
    }
  }

  try {
    revalidatePath("/clientes");
    revalidatePath("/configuracoes");
  } catch {
    // Route handlers can miss the Next cache store; the rows are already saved.
  }
  return {
    ok: true,
    created,
    updated,
    skipped: errors.length,
    total: drafts.length,
    errors: errors.slice(0, 30),
  };
}
