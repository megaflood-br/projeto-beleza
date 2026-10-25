import { parseBRLToCents } from "@/lib/money";
import { digitsOnly } from "@/lib/utils";
import { zonedDateTime } from "@/lib/dates";

export const CLIENT_IMPORT_HEADERS = [
  "Nome",
  "Observação",
  "Telefone",
  "Celular",
  "E-mail",
  "CPF",
  "RG",
  "Aniversário",
  "Endereço",
  "Número",
  "Rua",
  "Cidade",
  "Estado",
  "Saldo",
  "Data de",
  "Hashtag",
] as const;

const HEADER_ALIASES: Record<string, keyof ClientImportDraft | "ignore"> = {
  nome: "name",
  observacao: "notes",
  obs: "notes",
  telefone: "landline",
  celular: "phone",
  email: "email",
  "e mail": "email",
  cpf: "cpf",
  rg: "rg",
  aniversario: "birthDate",
  nascimento: "birthDate",
  "data de nascimento": "birthDate",
  endereco: "address",
  numero: "addressNumber",
  n: "addressNumber",
  rua: "district",
  bairro: "district",
  cidade: "city",
  estado: "state",
  uf: "state",
  saldo: "creditCents",
  credito: "creditCents",
  "data de": "createdAt",
  "data de cadastro": "createdAt",
  cadastro: "createdAt",
  hashtag: "tags",
  hashtags: "tags",
  tags: "tags",
};

export type ClientImportDraft = {
  name: string;
  notes: string | null;
  landline: string | null;
  phone: string;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  address: string | null;
  addressNumber: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  creditCents: number;
  createdAt: string | null;
  tags: string;
};

export type ClientImportIssue = { row: number; message: string };

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeImportPhone(celular?: string | null, telefone?: string | null) {
  let digits = digitsOnly(String(celular || telefone || ""));
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function isLikelyDate(value: string) {
  return /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value.trim());
}

export function parseImportDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!br) return null;
  const day = Number(br[1]);
  const month = Number(br[2]);
  let year = Number(br[3]);
  if (year < 100) year += year >= 50 ? 1900 : 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseSaldo(value: unknown) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 20000 && value < 80000) return 0;
    return Math.round(value * 100);
  }
  const raw = String(value).trim();
  if (!raw || isLikelyDate(raw)) return 0;
  return parseBRLToCents(raw);
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return parseImportDate(value) ?? "";
  return String(value).trim();
}

function headerMap(headers: unknown[]) {
  const mapped = headers.map((header) => HEADER_ALIASES[normalizeHeader(cellText(header))] ?? null);
  if (mapped.filter(Boolean).length >= 2) return mapped;
  return CLIENT_IMPORT_HEADERS.map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? null);
}

export function mapClientImportRows(table: unknown[][]) {
  const drafts: ClientImportDraft[] = [];
  const errors: ClientImportIssue[] = [];
  if (!table.length) return { drafts, errors: [{ row: 1, message: "Planilha vazia." }] };

  const columns = headerMap(table[0] ?? []);
  const seen = new Set<string>();

  table.slice(1).forEach((row, index) => {
    const line = index + 2;
    const raw: Partial<Record<keyof ClientImportDraft, string>> = {};
    columns.forEach((field, column) => {
      if (!field || field === "ignore") return;
      raw[field] = cellText(row?.[column]);
    });

    const name = (raw.name ?? "").replace(/\s+/g, " ").trim();
    const phone = normalizeImportPhone(raw.phone, raw.landline);
    if (!name && !phone) return;
    if (!name) {
      errors.push({ row: line, message: "Nome obrigatório." });
      return;
    }
    if (phone.length < 10) {
      errors.push({ row: line, message: "Celular ou telefone inválido." });
      return;
    }
    if (seen.has(phone)) {
      errors.push({ row: line, message: "Celular repetido na planilha." });
      return;
    }
    seen.add(phone);

    drafts.push({
      name,
      notes: raw.notes || null,
      landline: normalizeImportPhone(raw.landline) || null,
      phone,
      email: raw.email || null,
      cpf: raw.cpf || null,
      rg: raw.rg || null,
      birthDate: parseImportDate(raw.birthDate),
      address: raw.address || null,
      addressNumber: raw.addressNumber || null,
      district: raw.district || null,
      city: raw.city || null,
      state: raw.state || null,
      creditCents: parseSaldo(raw.creditCents),
      createdAt: parseImportDate(raw.createdAt),
      tags: (raw.tags ?? "").replace(/[#;]/g, ",").replace(/\s+,/g, ",").replace(/,\s+/g, ", ").trim(),
    });
  });

  return { drafts, errors };
}

export function toClientCreateData(draft: ClientImportDraft, tenantId: string) {
  return {
    tenantId,
    name: draft.name,
    phone: draft.phone,
    landline: draft.landline,
    email: draft.email,
    notes: draft.notes,
    tags: draft.tags,
    cpf: draft.cpf,
    rg: draft.rg,
    birthDate: draft.birthDate ? zonedDateTime(draft.birthDate, "12:00") : null,
    address: draft.address,
    addressNumber: draft.addressNumber,
    district: draft.district,
    city: draft.city,
    state: draft.state,
    creditCents: draft.creditCents,
    source: "importacao",
    createdAt: draft.createdAt ? zonedDateTime(draft.createdAt, "12:00") : undefined,
  };
}
