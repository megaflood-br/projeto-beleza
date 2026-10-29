import { calendarDate, shiftCalendarDate } from "@/lib/dates";

export const DOCUMENT_KINDS = ["CLCB", "ALVARA", "CERTIFICADO", "CONTRATO", "OUTRO"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENTATION_TABS = [
  {
    id: "pops",
    label: "POPs",
    description: "Procedimentos operacionais no padrão de vigilância sanitária, com impressão e QR para consulta.",
    kind: null,
  },
  {
    id: "clcb",
    label: "CLCB",
    description: "Certificado de Licença do Corpo de Bombeiros, vistorias e renovação.",
    kind: "CLCB",
    empty: "Nenhum CLCB arquivado ainda.",
    titlePlaceholder: "CLCB do salão",
    issuerPlaceholder: "Corpo de Bombeiros",
    numberPlaceholder: "Número da licença",
  },
  {
    id: "alvara",
    label: "Alvarás",
    description: "Alvará de funcionamento, sanitário e demais licenças da prefeitura.",
    kind: "ALVARA",
    empty: "Nenhum alvará arquivado ainda.",
    titlePlaceholder: "Alvará de funcionamento",
    issuerPlaceholder: "Prefeitura",
    numberPlaceholder: "Número do alvará",
  },
  {
    id: "certificado",
    label: "Certificados",
    description: "Cursos e capacitações dos prestadores — vincule ao profissional da equipe.",
    kind: "CERTIFICADO",
    empty: "Nenhum certificado de curso arquivado ainda.",
    titlePlaceholder: "Curso de manicure",
    issuerPlaceholder: "Instituição",
    numberPlaceholder: "Registro ou código",
  },
  {
    id: "contrato",
    label: "Contratos",
    description: "Contratos com prestadores, locação, fornecedores e parcerias.",
    kind: "CONTRATO",
    empty: "Nenhum contrato arquivado ainda.",
    titlePlaceholder: "Contrato de prestação",
    issuerPlaceholder: "Partes",
    numberPlaceholder: "Número ou pasta",
  },
  {
    id: "outro",
    label: "Outros",
    description: "Demais documentos para arquivo do salão: laudos, apólices, manuais.",
    kind: "OUTRO",
    empty: "Nenhum documento arquivado ainda.",
    titlePlaceholder: "Documento",
    issuerPlaceholder: "Emissor",
    numberPlaceholder: "Número",
  },
] as const;

export type DocumentationTab = (typeof DOCUMENTATION_TABS)[number]["id"];
export type ArchiveTab = Exclude<DocumentationTab, "pops">;
export type DocumentValidity = "none" | "valid" | "expiring" | "expired";

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  CLCB: "CLCB",
  ALVARA: "Alvará",
  CERTIFICADO: "Certificado",
  CONTRATO: "Contrato",
  OUTRO: "Outro",
};

export const DOCUMENT_VALIDITY_LABEL: Record<DocumentValidity, string> = {
  none: "Sem validade",
  valid: "Vigente",
  expiring: "A vencer",
  expired: "Vencido",
};

const EXPIRING_DAYS = 30;

export function isDocumentationTab(value: string | undefined): value is DocumentationTab {
  return DOCUMENTATION_TABS.some((tab) => tab.id === value);
}

export function parseDocumentationTab(value?: string | null): DocumentationTab {
  return value && isDocumentationTab(value) ? value : "pops";
}

export function documentationPath(tab: DocumentationTab = "pops") {
  return tab === "pops" ? "/documentacao" : `/documentacao?tab=${tab}`;
}

export function isArchiveTab(tab: DocumentationTab): tab is ArchiveTab {
  return tab !== "pops";
}

export function isDocumentKind(value: string | null | undefined): value is DocumentKind {
  return DOCUMENT_KINDS.includes(String(value ?? "").trim().toUpperCase() as DocumentKind);
}

export function parseDocumentKind(value: string | null | undefined): DocumentKind | null {
  const raw = String(value ?? "").trim().toUpperCase();
  return isDocumentKind(raw) ? raw : null;
}

export function documentationTabByKind(kind: DocumentKind) {
  return DOCUMENTATION_TABS.find((tab) => tab.kind === kind) ?? DOCUMENTATION_TABS[DOCUMENTATION_TABS.length - 1];
}

export function kindForTab(tab: ArchiveTab): DocumentKind {
  const found = DOCUMENTATION_TABS.find((item) => item.id === tab);
  if (!found || !found.kind) return "OUTRO";
  return found.kind;
}

export function documentFileHref(id: string, download = false) {
  return download ? `/documentacao/arquivo/${id}?download=1` : `/documentacao/arquivo/${id}`;
}

export function documentValidity(expiresAt: Date | string | null | undefined, now = new Date()): DocumentValidity {
  if (!expiresAt) return "none";
  const expiry = typeof expiresAt === "string" ? expiresAt.slice(0, 10) : calendarDate(expiresAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return "none";
  const today = calendarDate(now);
  if (expiry < today) return "expired";
  if (expiry <= shiftCalendarDate(today, EXPIRING_DAYS)) return "expiring";
  return "valid";
}

export function compareDocuments(
  left: { title: string; expiresAt: Date | string | null },
  right: { title: string; expiresAt: Date | string | null },
) {
  const rank: Record<DocumentValidity, number> = { expired: 0, expiring: 1, valid: 2, none: 3 };
  const byStatus = rank[documentValidity(left.expiresAt)] - rank[documentValidity(right.expiresAt)];
  if (byStatus !== 0) return byStatus;
  const leftExpiry = left.expiresAt ? String(left.expiresAt).slice(0, 10) : "9999-99-99";
  const rightExpiry = right.expiresAt ? String(right.expiresAt).slice(0, 10) : "9999-99-99";
  if (leftExpiry !== rightExpiry) return leftExpiry.localeCompare(rightExpiry);
  return left.title.localeCompare(right.title, "pt-BR");
}

export function downloadFileName(name: string, fallback = "documento") {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 120) || fallback;
}
