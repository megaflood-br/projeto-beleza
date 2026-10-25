import { digitsOnly } from "@/lib/utils";
import { amountForKind, splitFiscalLines, type FiscalConfig, type FiscalKind, type FiscalLine } from "@/lib/fiscal";

export const CONTORA_API = "https://fiscal.contora.com.br/api/v1";

export type ContoraStatus =
  | "draft"
  | "built"
  | "queued"
  | "processing"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "error";

export type ContoraDocument = {
  id: string;
  status?: string;
  access_key?: string | null;
  accessKey?: string | null;
  protocol?: string | null;
  number?: number | null;
  message?: string | null;
  authorized_at?: string | null;
};

type Envelope<T> = {
  ok?: boolean;
  data?: T;
  message?: string;
  error?: { type?: string; message?: string };
};

export function contoraEnvironment(value: string | null | undefined) {
  return value === "prod" || value === "producao" ? "producao" : "homologacao";
}

export function taxRegimeFromCrt(crt: string | null | undefined) {
  if (crt === "3") return "presumido";
  if (crt === "mei") return "mei";
  return "simples";
}

export function nationalTaxCode(serviceCode: string | null | undefined) {
  const digits = digitsOnly(serviceCode ?? "601");
  return digits.padStart(4, "0").slice(0, 6);
}

export function parseIssuerAddress(address: string | null | undefined, city: string | null | undefined) {
  const raw = String(address ?? "").trim();
  const cityName = String(city ?? "")
    .replace(/,\s*[A-Z]{2}\s*$/i, "")
    .trim();
  const match = raw.match(/^(.*?)[,\s]+(\d+[A-Za-z\-/]*)\s*$/);
  return {
    street: (match?.[1] ?? (raw || "Não informado")).trim(),
    number: (match?.[2] ?? "S/N").trim(),
    city: cityName || "São Paulo",
  };
}

export function mapContoraStatus(status: string | null | undefined): "PROCESSING" | "AUTHORIZED" | "REJECTED" | "CANCELLED" {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("autoriz") || value === "authorized") return "AUTHORIZED";
  if (value.includes("cancel")) return "CANCELLED";
  if (value.includes("rejeit") || value === "rejected" || value === "error" || value === "failed") return "REJECTED";
  return "PROCESSING";
}

export function paymentMethodCode(method: string | null | undefined) {
  const value = String(method ?? "").toUpperCase();
  if (value.includes("PIX")) return "17";
  if (value.includes("CREDIT") || value.includes("CREDITO") || value.includes("CRÉDITO")) return "03";
  if (value.includes("DEBIT") || value.includes("DEBITO") || value.includes("DÉBITO")) return "04";
  if (value.includes("CASH") || value.includes("DINHEIRO") || value.includes("MONEY")) return "01";
  return "99";
}

export function companyPayload(config: FiscalConfig & { zip?: string | null; district?: string | null; street?: string | null; number?: string | null }) {
  const parsed = parseIssuerAddress(config.street || config.address, config.city);
  return {
    legal_name: config.issuerName,
    trade_name: config.tradeName || config.issuerName,
    document: digitsOnly(config.cnpj),
    state_registration: config.ie || undefined,
    municipal_registration: config.im || undefined,
    phone: digitsOnly(config.phone ?? "") || undefined,
    state_code: config.uf,
    city_code: config.ibge || "3550308",
    street: config.street || parsed.street,
    number: config.number || parsed.number,
    district: config.district || "Centro",
    city_name: parsed.city,
    postal_code: digitsOnly(config.zip ?? "").padStart(8, "0").slice(-8) || "01001000",
    tax_regime: taxRegimeFromCrt(config.crt),
    default_environment: contoraEnvironment(config.environment),
    csc_id: config.cscId || undefined,
    csc_token: config.cscToken || undefined,
  };
}

export function nfseDraftPayload(params: {
  config: FiscalConfig;
  description: string;
  amountCents: number;
  recipient: { name: string; document: string; email?: string | null };
}) {
  const amount = Number((params.amountCents / 100).toFixed(2));
  const code = params.config.serviceCode || "6.01";
  return {
    environment: contoraEnvironment(params.config.environment),
    payload: {
      service: {
        description: params.description.slice(0, 2000),
        service_code: code,
        national_tax_code: nationalTaxCode(code),
        iss_rate: params.config.issPct,
        iss_withheld: false,
      },
      taker: {
        name: params.recipient.name,
        document: params.recipient.document || undefined,
        email: params.recipient.email || undefined,
      },
      amounts: {
        service_amount: amount,
        net_amount: amount,
      },
    },
  };
}

export function goodsDraftPayload(params: {
  kind: "NFCE" | "NFE";
  config: FiscalConfig;
  number: number;
  lines: FiscalLine[];
  amountCents: number;
  recipient: { name: string; document: string };
  paymentMethod?: string | null;
}) {
  const items = (params.kind === "NFCE" || params.kind === "NFE" ? splitFiscalLines(params.lines).products : params.lines).map(
    (line, index) => ({
      code: String(index + 1),
      name: line.description.slice(0, 120),
      ncm: digitsOnly(line.ncm ?? "33049990") || "33049990",
      cfop: digitsOnly(line.cfop ?? "5102") || "5102",
      unit: "UN",
      quantity: line.quantity,
      unit_price: Number((line.priceCents / 100).toFixed(2)),
      taxes: {
        icms: { code: params.config.crt === "3" ? "00" : "102", origin: 0 },
        pis: { code: "49", aliquot: 0 },
        cofins: { code: "49", aliquot: 0 },
      },
    }),
  );
  const amount = Number((params.amountCents / 100).toFixed(2));
  return {
    document_type: params.kind === "NFE" ? "nfe" : "nfce",
    environment: contoraEnvironment(params.config.environment),
    series: Number(params.config.series) || 1,
    number: params.number,
    payload: {
      nature_operation: params.kind === "NFE" ? "Venda de mercadoria" : "Venda ao consumidor",
      operation_type: "saida",
      consumer_final: true,
      presence_indicator: 1,
      recipient: params.recipient.document
        ? { name: params.recipient.name, document: params.recipient.document, indicator_state_registration: "9" }
        : undefined,
      items,
      payments: [{ method: paymentMethodCode(params.paymentMethod), amount }],
    },
  };
}

function readData<T>(body: Envelope<T> | T): T {
  if (body && typeof body === "object" && "data" in body && (body as Envelope<T>).data !== undefined) {
    return (body as Envelope<T>).data as T;
  }
  return body as T;
}

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export async function contoraRequest<T>(
  token: string,
  path: string,
  init?: RequestInit & { companyDocument?: string; idempotency?: string },
) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init?.companyDocument) headers.set("X-Company-Document", digitsOnly(init.companyDocument));
  if (init?.idempotency) headers.set("Idempotency-Key", init.idempotency);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${CONTORA_API}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(20000),
  });
  const body = (await response.json().catch(() => ({}))) as Envelope<T> & { message?: string };
  if (!response.ok || body.ok === false) {
    const message = body.message || body.error?.message || `Contora ${response.status}`;
    throw new Error(message);
  }
  return readData<T>(body);
}

export async function findContoraCompany(token: string, cnpj: string) {
  const document = digitsOnly(cnpj);
  try {
    const byDocument = await contoraRequest<{ id: string }>(token, `/companies/by-document/${document}`);
    if (byDocument?.id) return byDocument;
  } catch {
    // lista por filtro
  }
  const listed = await contoraRequest<unknown>(token, `/companies?document=${document}&per_page=5`);
  return asList<{ id: string; document?: string }>(listed).find((item) => digitsOnly(item.document ?? "") === document) ?? null;
}

export async function ensureContoraCompany(
  token: string,
  config: FiscalConfig & { zip?: string | null; district?: string | null; street?: string | null; number?: string | null; companyId?: string | null },
) {
  const payload = companyPayload(config);
  if (config.companyId) {
    try {
      await contoraRequest(token, `/companies/${config.companyId}`, { method: "PATCH", body: JSON.stringify(payload) });
      return config.companyId;
    } catch {
      // recria se o id não existir mais
    }
  }
  const existing = await findContoraCompany(token, config.cnpj);
  if (existing?.id) {
    await contoraRequest(token, `/companies/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) }).catch(() => null);
    return existing.id;
  }
  const created = await contoraRequest<{ id: string }>(token, "/companies", {
    method: "POST",
    body: JSON.stringify(payload),
    idempotency: `empresa-${payload.document}`,
  });
  if (!created?.id) throw new Error("A Contora não devolveu o id da empresa.");
  return created.id;
}

export async function uploadContoraCertificate(token: string, companyId: string, file: File, password: string) {
  const form = new FormData();
  form.set("certificate", file, file.name || "certificado.pfx");
  form.set("password", password);
  return contoraRequest<{ valid_until?: string; validUntil?: string; name?: string }>(token, `/companies/${companyId}/certificate`, {
    method: "POST",
    body: form,
  });
}

async function pollDocument(token: string, family: "nfse" | "nfe", id: string, companyDocument: string) {
  let last: ContoraDocument = { id };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    last = await contoraRequest<ContoraDocument>(token, `/${family}/drafts/${id}/status`, { companyDocument });
    const mapped = mapContoraStatus(last.status);
    if (mapped !== "PROCESSING") return last;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return last;
}

export async function emitContoraDocument(params: {
  token: string;
  kind: FiscalKind;
  config: FiscalConfig;
  number: number;
  amountCents: number;
  description: string;
  lines: FiscalLine[];
  recipient: { name: string; document: string; email?: string | null };
  paymentMethod?: string | null;
  idempotency: string;
}) {
  const companyDocument = params.config.cnpj;
  if (params.kind === "NFSE") {
    const draft = await contoraRequest<ContoraDocument>(params.token, "/nfse/drafts", {
      method: "POST",
      companyDocument,
      idempotency: params.idempotency,
      body: JSON.stringify(nfseDraftPayload(params)),
    });
    await contoraRequest(params.token, `/nfse/drafts/${draft.id}/dispatch`, {
      method: "POST",
      companyDocument,
      body: JSON.stringify({}),
    });
    const final = await pollDocument(params.token, "nfse", draft.id, companyDocument);
    return {
      id: final.id ?? draft.id,
      status: mapContoraStatus(final.status),
      accessKey: final.access_key ?? final.accessKey ?? null,
      protocol: final.protocol ?? null,
      number: final.number ?? params.number,
      error: mapContoraStatus(final.status) === "REJECTED" ? final.message || "Contora rejeitou a NFS-e." : null,
    };
  }

  const draft = await contoraRequest<ContoraDocument>(params.token, "/nfe/drafts", {
    method: "POST",
    companyDocument,
    idempotency: params.idempotency,
    body: JSON.stringify(
      goodsDraftPayload({
        kind: params.kind === "NFE" ? "NFE" : "NFCE",
        config: params.config,
        number: params.number,
        lines: params.lines,
        amountCents: params.amountCents,
        recipient: params.recipient,
        paymentMethod: params.paymentMethod,
      }),
    ),
  });
  await contoraRequest(params.token, `/nfe/drafts/${draft.id}/dispatch`, {
    method: "POST",
    companyDocument,
    body: JSON.stringify({ action: "authorize" }),
  });
  const final = await pollDocument(params.token, "nfe", draft.id, companyDocument);
  return {
    id: final.id ?? draft.id,
    status: mapContoraStatus(final.status),
    accessKey: final.access_key ?? final.accessKey ?? null,
    protocol: final.protocol ?? null,
    number: final.number ?? params.number,
    error: mapContoraStatus(final.status) === "REJECTED" ? final.message || "Contora rejeitou o documento." : null,
  };
}

export async function cancelContoraDocument(token: string, kind: string, documentId: string, companyDocument: string) {
  const family = kind === "NFSE" ? "nfse" : "nfe";
  await contoraRequest(token, `/${family}/drafts/${documentId}/cancel`, {
    method: "POST",
    companyDocument,
    body: JSON.stringify({ justification: "Cancelamento solicitado pelo salão no MegaBeauty." }),
  });
}

export function contoraArtifactPath(kind: string, documentId: string) {
  if (kind === "NFSE") return `/nfse/drafts/${documentId}/artifacts/pdf_nfse`;
  return `/nfe/drafts/${documentId}/artifacts/pdf_danfe`;
}

export function amountFromLines(kind: FiscalKind, lines: FiscalLine[], fallbackCents: number) {
  return amountForKind(kind, lines) || fallbackCents;
}
