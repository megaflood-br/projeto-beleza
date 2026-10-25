import { digitsOnly } from "@/lib/utils";
import { itemLineTotal } from "@/lib/comandas";

export const FISCAL_KINDS = [
  { id: "NFSE", label: "NFS-e (serviço)", model: "00" },
  { id: "NFCE", label: "NFC-e (produto)", model: "65" },
  { id: "NFE", label: "NF-e (produto)", model: "55" },
] as const;

export type FiscalKind = (typeof FISCAL_KINDS)[number]["id"];
export type FiscalStatus = "DRAFT" | "PROCESSING" | "AUTHORIZED" | "REJECTED" | "CANCELLED";

export const FISCAL_STATUS_LABEL: Record<FiscalStatus, string> = {
  DRAFT: "Rascunho",
  PROCESSING: "Processando",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

export const FISCAL_STATUS_COLOR: Record<FiscalStatus, string> = {
  DRAFT: "#64748b",
  PROCESSING: "#2563eb",
  AUTHORIZED: "#059669",
  REJECTED: "#dc2626",
  CANCELLED: "#b45309",
};

export type FiscalConfig = {
  enabled: boolean;
  cnpj: string;
  ie: string | null;
  im: string | null;
  crt: string;
  uf: string;
  ibge: string | null;
  issPct: number;
  serviceCode: string;
  series: string;
  nextNumber: number;
  provider: string;
  providerUrl: string | null;
  providerToken: string | null;
  environment: string;
  autoIssue: boolean;
  issuerName: string;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  zip: string | null;
  cscId: string | null;
  cscToken: string | null;
  companyId: string | null;
  certificateUntil: string | null;
};

export type FiscalLine = {
  type: string;
  description: string;
  quantity: number;
  priceCents: number;
  discountCents?: number;
  fiscalCode?: string | null;
  issPct?: number | null;
  ncm?: string | null;
  cfop?: string | null;
};

export function isFiscalKind(value: string): value is FiscalKind {
  return FISCAL_KINDS.some((kind) => kind.id === value);
}

export function isFiscalStatus(value: string): value is FiscalStatus {
  return value in FISCAL_STATUS_LABEL;
}

export function fiscalKindLabel(kind: string) {
  return FISCAL_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

export function fiscalKindModel(kind: string) {
  return FISCAL_KINDS.find((item) => item.id === kind)?.model ?? "55";
}

export function tenantFiscalConfig(tenant: {
  name: string;
  tradeName?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  fiscalEnabled?: boolean;
  fiscalCnpj?: string | null;
  fiscalIe?: string | null;
  fiscalIm?: string | null;
  fiscalCrt?: string | null;
  fiscalUf?: string | null;
  fiscalIbge?: string | null;
  fiscalIssPct?: number | null;
  fiscalServiceCode?: string | null;
  fiscalSeries?: string | null;
  fiscalNextNumber?: number | null;
  fiscalProvider?: string | null;
  fiscalProviderUrl?: string | null;
  fiscalProviderToken?: string | null;
  fiscalEnvironment?: string | null;
  fiscalAutoIssue?: boolean | null;
  fiscalStreet?: string | null;
  fiscalNumber?: string | null;
  fiscalDistrict?: string | null;
  fiscalZip?: string | null;
  fiscalCscId?: string | null;
  fiscalCscToken?: string | null;
  fiscalContoraCompanyId?: string | null;
  fiscalCertificateUntil?: Date | string | null;
}): FiscalConfig {
  return {
    enabled: Boolean(tenant.fiscalEnabled),
    cnpj: digitsOnly(tenant.fiscalCnpj || tenant.document || ""),
    ie: tenant.fiscalIe ?? null,
    im: tenant.fiscalIm ?? null,
    crt: tenant.fiscalCrt || "1",
    uf: (tenant.fiscalUf || "SP").toUpperCase(),
    ibge: tenant.fiscalIbge ?? null,
    issPct: Math.min(100, Math.max(0, tenant.fiscalIssPct ?? 5)),
    serviceCode: tenant.fiscalServiceCode || "6.01",
    series: tenant.fiscalSeries || "1",
    nextNumber: Math.max(1, tenant.fiscalNextNumber ?? 1),
    provider: tenant.fiscalProvider || "contora",
    providerUrl: tenant.fiscalProviderUrl ?? null,
    providerToken: tenant.fiscalProviderToken ?? null,
    environment: tenant.fiscalEnvironment === "prod" ? "prod" : "homolog",
    autoIssue: Boolean(tenant.fiscalAutoIssue),
    issuerName: tenant.name,
    tradeName: tenant.tradeName ?? null,
    phone: tenant.phone ?? null,
    email: tenant.email ?? null,
    address: tenant.address ?? null,
    city: tenant.city ?? null,
    street: tenant.fiscalStreet ?? null,
    number: tenant.fiscalNumber ?? null,
    district: tenant.fiscalDistrict ?? null,
    zip: tenant.fiscalZip ?? null,
    cscId: tenant.fiscalCscId ?? null,
    cscToken: tenant.fiscalCscToken ?? null,
    companyId: tenant.fiscalContoraCompanyId ?? null,
    certificateUntil: tenant.fiscalCertificateUntil ? new Date(tenant.fiscalCertificateUntil).toISOString() : null,
  };
}

export function formatCnpj(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (digits.length !== 14) return value || "—";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCpf(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (digits.length !== 11) return value || "—";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function weightedDigit(digits: string, weights: number[]) {
  const sum = digits.split("").reduce((total, digit, index) => total + Number(digit) * (weights[index] ?? 0), 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const d1 = weightedDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = weightedDigit(digits.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${d1}${d2}`);
}

export function isValidCpf(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const d1 = weightedDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = weightedDigit(digits.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${d1}${d2}`);
}

export function ufCode(uf: string) {
  const map: Record<string, string> = {
    AC: "12", AL: "27", AM: "13", AP: "16", BA: "29", CE: "23", DF: "53", ES: "32", GO: "52",
    MA: "21", MG: "31", MS: "50", MT: "51", PA: "15", PB: "25", PE: "26", PI: "22", PR: "41",
    RJ: "33", RN: "24", RO: "11", RR: "14", RS: "43", SC: "42", SE: "28", SP: "35", TO: "17",
  };
  return map[uf.toUpperCase()] ?? "35";
}

export function accessKeyCheckDigit(body43: string) {
  let weight = 2;
  let sum = 0;
  for (let i = body43.length - 1; i >= 0; i -= 1) {
    sum += Number(body43[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const digit = rest === 0 || rest === 1 ? 0 : 11 - rest;
  return String(digit);
}

export function buildAccessKey(params: {
  uf: string;
  issuedAt: Date;
  cnpj: string;
  kind: string;
  series: string;
  number: number;
  code?: string;
}) {
  const yearMonth = `${String(params.issuedAt.getUTCFullYear()).slice(2)}${String(params.issuedAt.getUTCMonth() + 1).padStart(2, "0")}`;
  const code = (params.code ?? String(10000000 + (params.number % 89999999))).padStart(8, "0").slice(0, 8);
  const body = [
    ufCode(params.uf),
    yearMonth,
    digitsOnly(params.cnpj).padStart(14, "0").slice(0, 14),
    fiscalKindModel(params.kind),
    digitsOnly(params.series).padStart(3, "0").slice(-3),
    String(params.number).padStart(9, "0").slice(-9),
    "1",
    code,
  ].join("");
  return `${body}${accessKeyCheckDigit(body)}`;
}

export function formatAccessKey(value: string | null | undefined) {
  const digits = digitsOnly(value ?? "");
  if (digits.length !== 44) return value || "—";
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function taxCentsForKind(kind: string, amountCents: number, issPct: number) {
  if (kind !== "NFSE") return 0;
  return Math.round((Math.max(0, amountCents) * Math.max(0, issPct)) / 100);
}

export function lineAmountCents(line: FiscalLine) {
  return itemLineTotal(line);
}

export function splitFiscalLines(lines: FiscalLine[]) {
  const services = lines.filter((line) => line.type === "SERVICE");
  const products = lines.filter((line) => line.type !== "SERVICE");
  return { services, products };
}

export function suggestKinds(lines: FiscalLine[]): FiscalKind[] {
  const { services, products } = splitFiscalLines(lines);
  const kinds: FiscalKind[] = [];
  if (services.length) kinds.push("NFSE");
  if (products.length) kinds.push("NFCE");
  return kinds.length ? kinds : ["NFSE"];
}

export function amountForKind(kind: string, lines: FiscalLine[]) {
  const { services, products } = splitFiscalLines(lines);
  const selected = kind === "NFSE" ? services : kind === "NFCE" || kind === "NFE" ? products : lines;
  return selected.reduce((sum, line) => sum + lineAmountCents(line), 0);
}

export function fiscalReady(config: FiscalConfig) {
  return Boolean(config.enabled && isValidCnpj(config.cnpj));
}

export function recipientDocument(client: { cpf?: string | null; cnpj?: string | null }) {
  const cpf = digitsOnly(client.cpf ?? "");
  const cnpj = digitsOnly(client.cnpj ?? "");
  if (isValidCpf(cpf)) return { type: "cpf" as const, value: cpf };
  if (isValidCnpj(cnpj)) return { type: "cnpj" as const, value: cnpj };
  return { type: "none" as const, value: "" };
}
