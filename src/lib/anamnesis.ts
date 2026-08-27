import { prisma } from "@/lib/db";
import { calendarDate } from "@/lib/dates";
import { slugify } from "@/lib/utils";

export const ANAMNESIS_STATUSES = ["DRAFT", "COMPLETED"] as const;
export type AnamnesisStatus = (typeof ANAMNESIS_STATUSES)[number];

export const ANAMNESIS_STATUS_LABEL: Record<AnamnesisStatus, string> = {
  DRAFT: "Rascunho",
  COMPLETED: "Concluída",
};

export const ANAMNESIS_STATUS_COLOR: Record<AnamnesisStatus, string> = {
  DRAFT: "#64748B",
  COMPLETED: "#059669",
};

export const ANAMNESIS_AREAS = ["geral", "cabelo", "estetica", "unhas"] as const;
export type AnamnesisArea = (typeof ANAMNESIS_AREAS)[number];

export const ANAMNESIS_AREA_LABEL: Record<AnamnesisArea, string> = {
  geral: "Geral",
  cabelo: "Cabelo",
  estetica: "Estética",
  unhas: "Unhas",
};

export const QUESTION_TYPES = ["yes_no", "text", "long_text", "choice"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  yes_no: "Sim / Não",
  text: "Texto curto",
  long_text: "Texto longo",
  choice: "Múltipla escolha",
};

export type AnamnesisQuestion = {
  id: string;
  label: string;
  hint?: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  alertOn?: string;
  withDetail?: boolean;
};

export type AnamnesisAnswer = {
  value: string;
  detail?: string;
};

export type AnamnesisAnswers = Record<string, AnamnesisAnswer>;

function q(
  id: string,
  label: string,
  opts: Partial<Omit<AnamnesisQuestion, "id" | "label">> = {},
): AnamnesisQuestion {
  return {
    id,
    label,
    type: "yes_no",
    required: true,
    withDetail: true,
    ...opts,
  };
}

export const DEFAULT_ANAMNESIS_FORMS: {
  name: string;
  slug: string;
  area: AnamnesisArea;
  description: string;
  questions: AnamnesisQuestion[];
}[] = [
  {
    name: "Anamnese geral",
    slug: "geral",
    area: "geral",
    description: "Saúde, alergias e restrições para qualquer atendimento.",
    questions: [
      q("alergia", "Possui alguma alergia?", { alertOn: "yes", hint: "Alimentos, medicamentos, látex, metais, fragrâncias." }),
      q("medicamentos", "Faz uso de medicamentos contínuos?", { alertOn: "yes" }),
      q("gestante", "Está gestante ou amamentando?", { alertOn: "yes" }),
      q("cronica", "Possui doença crônica (diabetes, hipertensão, tireoide, asma)?", { alertOn: "yes" }),
      q("herpes", "Tem herpes, micose, ferida ou infecção ativa na área do procedimento?", { alertOn: "yes" }),
      q("queloide", "Tem tendência a queloides ou cicatrização difícil?", { alertOn: "yes" }),
      q("reacao", "Já teve reação a tinta, henna, esmalte, ácido, látex ou anestésico?", { alertOn: "yes" }),
      q("observacoes", "Observações gerais", { type: "long_text", required: false, withDetail: false }),
    ],
  },
  {
    name: "Coloração e química capilar",
    slug: "coloracao",
    area: "cabelo",
    description: "Mechas, coloração, descoloração, progressiva e alisamentos.",
    questions: [
      q("quimica_recente", "Fez progressiva, descoloração ou coloração nos últimos 30 dias?", { alertOn: "yes" }),
      q("couro", "O couro cabeludo está sensibilizado, com feridas ou caspa intensa?", { alertOn: "yes" }),
      q("ppd", "Tem alergia a PPD, amônia, oxidantes ou henna?", { alertOn: "yes" }),
      q("teste_mecha", "Já fez teste de mecha / toque neste salão?", { required: false, withDetail: false }),
      q("queda", "Tem queda de cabelo ou rarefação visível?", { alertOn: "yes" }),
      q("observacoes", "Observações do profissional", { type: "long_text", required: false, withDetail: false }),
    ],
  },
  {
    name: "Estética facial e corporal",
    slug: "estetica",
    area: "estetica",
    description: "Limpeza de pele, peeling, laser e procedimentos estéticos.",
    questions: [
      q("acidos", "Usa ácidos, retinoides ou clareadores no momento?", { alertOn: "yes" }),
      q("procedimento", "Fez botox, preenchimento, peeling ou laser recentemente?", { alertOn: "yes" }),
      q("pele", "Possui rosácea, acne ativa, melasma ou pele muito sensível?", { alertOn: "yes" }),
      q("sol", "Teve exposição solar intensa nos últimos 7 dias?", { alertOn: "yes" }),
      q("protetor", "Usa protetor solar diariamente?", { required: false, withDetail: false }),
      q("observacoes", "Observações do profissional", { type: "long_text", required: false, withDetail: false }),
    ],
  },
  {
    name: "Unhas e alongamento",
    slug: "unhas",
    area: "unhas",
    description: "Esmaltação, gel, acrílico e cuidados com a lâmina ungueal.",
    questions: [
      q("micose", "Tem micose, unha encravada, paroníquia ou inflamação?", { alertOn: "yes" }),
      q("alergia_gel", "Tem alergia a esmalte, gel, acrílico ou monômero?", { alertOn: "yes" }),
      q("circulacao", "Tem diabetes, má circulação ou toma anticoagulante?", { alertOn: "yes" }),
      q("alongamento", "Já usou alongamento, fibra ou gel em outra clínica?", { required: false }),
      q("observacoes", "Observações do profissional", { type: "long_text", required: false, withDetail: false }),
    ],
  },
];

export function parseQuestions(raw: string | null | undefined): AnamnesisQuestion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => normalizeQuestion(item, index))
      .filter((item): item is AnamnesisQuestion => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeQuestion(item: unknown, index: number): AnamnesisQuestion | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const label = String(row.label ?? "").trim();
  if (!label) return null;
  const type = QUESTION_TYPES.includes(row.type as QuestionType) ? (row.type as QuestionType) : "text";
  const options = Array.isArray(row.options)
    ? row.options.map((opt) => String(opt).trim()).filter(Boolean)
    : undefined;
  return {
    id: String(row.id ?? (slugify(label) || `q-${index}`)),
    label,
    hint: String(row.hint ?? "").trim() || undefined,
    type,
    options,
    required: Boolean(row.required),
    alertOn: String(row.alertOn ?? "").trim() || undefined,
    withDetail: Boolean(row.withDetail),
  };
}

export function parseAnswers(raw: string | null | undefined): AnamnesisAnswers {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: AnamnesisAnswers = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === "object" && "value" in (value as object)) {
        const row = value as { value?: unknown; detail?: unknown };
        out[key] = { value: String(row.value ?? ""), detail: String(row.detail ?? "").trim() || undefined };
      } else {
        out[key] = { value: String(value ?? "") };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeQuestions(questions: AnamnesisQuestion[]) {
  return JSON.stringify(
    questions.map((item, index) => normalizeQuestion(item, index)).filter((item): item is AnamnesisQuestion => Boolean(item)),
  );
}

export function serializeAnswers(answers: AnamnesisAnswers) {
  return JSON.stringify(answers);
}

export function collectAlerts(questions: AnamnesisQuestion[], answers: AnamnesisAnswers) {
  return questions
    .filter((question) => question.alertOn && answers[question.id]?.value === question.alertOn)
    .map((question) => {
      const detail = answers[question.id]?.detail?.trim();
      return detail ? `${question.label} ${detail}` : question.label;
    });
}

export function missingRequired(questions: AnamnesisQuestion[], answers: AnamnesisAnswers) {
  return questions
    .filter((question) => question.required)
    .filter((question) => !String(answers[question.id]?.value ?? "").trim())
    .map((question) => question.label);
}

const seeding = new Map<string, Promise<void>>();

export async function ensureAnamnesisForms(tenantId: string) {
  const existing = seeding.get(tenantId);
  if (existing) {
    await existing;
    return;
  }
  const task = seedIfEmpty(tenantId).finally(() => seeding.delete(tenantId));
  seeding.set(tenantId, task);
  await task;
}

async function seedIfEmpty(tenantId: string) {
  const count = await prisma.anamnesisForm.count({ where: { tenantId } });
  if (count > 0) return;
  for (const [index, form] of DEFAULT_ANAMNESIS_FORMS.entries()) {
    await prisma.anamnesisForm.create({
      data: {
        tenantId,
        name: form.name,
        slug: form.slug,
        area: form.area,
        description: form.description,
        questions: serializeQuestions(form.questions),
        sortOrder: index,
      },
    });
  }
}

export function isAnamnesisStatus(value: string): value is AnamnesisStatus {
  return ANAMNESIS_STATUSES.includes(value as AnamnesisStatus);
}

export function isAnamnesisArea(value: string): value is AnamnesisArea {
  return ANAMNESIS_AREAS.includes(value as AnamnesisArea);
}

export function mapFormRow(form: {
  id: string;
  name: string;
  slug: string;
  area: string;
  description: string;
  questions: string;
  active: boolean;
  _count?: { records: number };
}): {
  id: string;
  name: string;
  slug: string;
  area: AnamnesisArea;
  description: string;
  questions: AnamnesisQuestion[];
  active: boolean;
  records: number;
} {
  return {
    id: form.id,
    name: form.name,
    slug: form.slug,
    area: isAnamnesisArea(form.area) ? form.area : "geral",
    description: form.description,
    questions: parseQuestions(form.questions),
    active: form.active,
    records: form._count?.records ?? 0,
  };
}

export function mapAnamnesisRow(row: {
  id: string;
  clientId: string;
  formId: string;
  professionalId: string | null;
  status: string;
  answers: string;
  notes: string | null;
  signedName: string | null;
  signedAt: Date | null;
  occurredAt: Date;
  createdAt: Date;
  client: { name: string; phone: string };
  form: { name: string; area: string; questions: string };
  professional: { name: string } | null;
}) {
  const questions = parseQuestions(row.form.questions);
  const answers = parseAnswers(row.answers);
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.name,
    clientPhone: row.client.phone,
    formId: row.formId,
    formName: row.form.name,
    formArea: (isAnamnesisArea(row.form.area) ? row.form.area : "geral") as AnamnesisArea,
    professionalId: row.professionalId,
    professionalName: row.professional?.name ?? null,
    status: isAnamnesisStatus(row.status) ? row.status : "DRAFT",
    answers: row.answers,
    notes: row.notes,
    signedName: row.signedName,
    signedAt: row.signedAt ? row.signedAt.toISOString() : null,
    occurredAt: calendarDate(row.occurredAt),
    createdAt: row.createdAt.toISOString(),
    alerts: collectAlerts(questions, answers),
  };
}
