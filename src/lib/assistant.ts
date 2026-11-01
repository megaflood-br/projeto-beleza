import { buildSlots, parseHHmm } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { effectiveMinStock, formatStockQty, isLowStock } from "@/lib/stock";

export type AssistantProduct = {
  name: string;
  stock: number;
  minStock: number;
  unit: string;
};

export type AssistantAppointment = {
  time: string;
  end: string;
  client: string;
  professional: string;
  status: string;
};

export type AssistantProfessional = {
  name: string;
  nickname?: string | null;
  appointmentsToday: number;
  workStart: string;
  workEnd: string;
  freeSlots: string[];
};

export type AssistantSnapshot = {
  salon: string;
  dayLabel: string;
  revenueCents: number;
  occupancy: number;
  noShows: number;
  appointments: AssistantAppointment[];
  products: AssistantProduct[];
  professionals: AssistantProfessional[];
};

export type AssistantIntent =
  | "greeting"
  | "low_stock"
  | "today_agenda"
  | "free_slot"
  | "idle_team"
  | "revenue"
  | "general";

const MENTION_STOPWORDS = new Set([
  "hoje",
  "amanha",
  "agora",
  "tarde",
  "manha",
  "noite",
  "semana",
  "equipe",
  "salao",
  "agenda",
  "horario",
  "horarios",
  "cliente",
  "clientes",
  "profissional",
  "profissionais",
  "disponivel",
  "disponibilidade",
  "livre",
  "vaga",
  "vagas",
  "encaixe",
  "atendimento",
]);

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function professionalLabels(professionals: { name: string; nickname?: string | null }[]) {
  return professionals.flatMap((row) =>
    [row.name, row.nickname].filter((value): value is string => Boolean(value && value.trim())),
  );
}

export function lowStockProducts(products: AssistantProduct[]) {
  return products
    .filter((product) => isLowStock(product.stock, product.minStock))
    .slice()
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "pt-BR"));
}

export function idleProfessionals(professionals: AssistantProfessional[]) {
  return professionals.filter((row) => row.appointmentsToday === 0);
}

export function assistantDayOffset(question: string) {
  const q = fold(question);
  if (/\bamanha\b/.test(q)) return 1;
  return 0;
}

export function assistantDayLabel(offset: number) {
  return offset === 1 ? "amanhã" : "hoje";
}

export function mentionedPerson(question: string) {
  const q = fold(question);
  const match = q.match(/\b(?:da|do|de|com|pra|para)\s+([a-z]{3,})/);
  const token = match?.[1] ?? "";
  if (!token || MENTION_STOPWORDS.has(token)) return "";
  return token;
}

function nameTokens(name: string) {
  return fold(name)
    .split(/[\s'’-]+/)
    .filter((token) => token.length >= 3 && !MENTION_STOPWORDS.has(token));
}

function hasWord(question: string, token: string) {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(question);
}

export function matchProfessionalName(question: string, names: string[]) {
  const q = fold(question);
  const sorted = names.slice().sort((a, b) => fold(b).length - fold(a).length);
  for (const name of sorted) {
    const full = fold(name);
    if (full.length >= 3 && hasWord(q, full)) return name;
    for (const token of nameTokens(name)) {
      if (hasWord(q, token)) return name;
    }
  }
  return null;
}

export function matchProfessional(question: string, professionals: AssistantProfessional[]) {
  const label = matchProfessionalName(question, professionalLabels(professionals));
  if (!label) return null;
  const folded = fold(label);
  return (
    professionals.find((row) => fold(row.name) === folded || fold(row.nickname ?? "") === folded) ?? null
  );
}

export function freeSlotsForProfessional(input: {
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  busy: { start: string; end: string }[];
  nowHHmm?: string;
}) {
  const step = Math.max(5, input.slotMinutes || 15);
  const slots = buildSlots(input.openTime, input.closeTime, step);
  const now = input.nowHHmm ? parseHHmm(input.nowHHmm) : null;
  return slots.filter((slot) => {
    const start = parseHHmm(slot);
    if (now != null && start < now) return false;
    const end = start + step;
    return !input.busy.some((row) => start < parseHHmm(row.end) && end > parseHHmm(row.start));
  });
}

export function summarizeSlots(slots: string[], limit = 8) {
  if (!slots.length) return "nenhum";
  const shown = slots.slice(0, limit);
  const extra = slots.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} e mais ${extra}` : shown.join(", ");
}

function mentionsSchedule(question: string) {
  return /(horario|horarios|agenda|encaixe|vaga|vagas|disponivel|disponiveis|disponibilidade|livre|livres|aberto|sobra)/.test(
    fold(question),
  );
}

function asksAvailability(question: string) {
  const q = fold(question);
  return (
    /(horario|horarios|agenda|encaixe).*(livre|livres|disponivel|disponiveis|disponibilidade|vago|vaga|vagas|aberto|sobra)/.test(q) ||
    /(livre|livres|disponivel|disponiveis|disponibilidade|vago|vaga|vagas|aberto|sobra).*(horario|horarios|agenda|encaixe)/.test(q) ||
    /(tem|tinha|ha|existe|quais?|qual).*(horario|encaixe|vaga|disponibilidade)/.test(q) ||
    /(esta|ta|fica).*(livre|disponivel)/.test(q)
  );
}

export function assistantIntent(question: string, professionalNames: string[] = []): AssistantIntent {
  const q = fold(question);
  if (!q) return "greeting";
  if (
    /(estoque|produto).*(baixa|baixo|minimo|acab|falta|repor|zerad)/.test(q) ||
    /(baixa|baixo|minimo|acab|falta|repor|zerad).*(estoque|produto)/.test(q) ||
    /quais? produtos?( estao| esta)?( em)? (baixa|acabando)/.test(q)
  ) {
    return "low_stock";
  }
  const named = Boolean(matchProfessionalName(question, professionalNames));
  if (named && mentionsSchedule(question)) return "free_slot";
  if (asksAvailability(question)) return "free_slot";
  if (/(agenda|horario|atendimento).*(hoje|agora)|quem (atende|tem horario) hoje/.test(q)) {
    return "today_agenda";
  }
  if (/(ociosa|ocioso|sem cliente|buraco).*(hoje|agenda|profissional)?|(profissional|equipe).*(livre|ociosa|ocioso)/.test(q)) {
    return "idle_team";
  }
  if (/(faturamento|caixa|quanto).*hoje|hoje.*(faturamento|caixa|entrou)/.test(q)) {
    return "revenue";
  }
  return "general";
}

export function formatLowStockLine(product: AssistantProduct) {
  return `${product.name}: ${formatStockQty(product.stock, product.unit)} (mínimo ${formatStockQty(effectiveMinStock(product.minStock), product.unit)})`;
}

export function answerLowStock(products: AssistantProduct[]) {
  const items = lowStockProducts(products);
  if (!items.length) {
    return "Nenhum produto ativo está em baixa agora. Todos estão acima do estoque mínimo.";
  }
  const lines = items.map((item) => `- ${formatLowStockLine(item)}`);
  return [`Estão em baixa ${items.length} produto(s):`, ...lines, "Reponha antes do próximo pico de atendimento."].join("\n");
}

export function answerTodayAgenda(snapshot: AssistantSnapshot) {
  if (!snapshot.appointments.length) {
    return `A agenda de ${snapshot.salon} está vazia ${snapshot.dayLabel}. Vale publicar o link de agendamento e avisar as clientes no WhatsApp.`;
  }
  const lines = snapshot.appointments.map(
    (row) => `- ${row.time} ${row.client} com ${row.professional} (${row.status})`,
  );
  return [`${snapshot.dayLabel === "hoje" ? "Hoje" : "Amanhã"} há ${snapshot.appointments.length} horário(s):`, ...lines].join("\n");
}

function bookedFor(snapshot: AssistantSnapshot, professionalName: string) {
  return snapshot.appointments.filter((row) => fold(row.professional) === fold(professionalName));
}

function bookedSummary(rows: AssistantAppointment[]) {
  if (!rows.length) return "";
  return `Já agendado: ${rows.map((row) => `${row.time} ${row.client} (${row.status})`).join("; ")}.`;
}

export function answerFreeSlots(snapshot: AssistantSnapshot, question: string) {
  const names = professionalLabels(snapshot.professionals);
  const matched = matchProfessional(question, snapshot.professionals);
  const mentioned = mentionedPerson(question);
  if (!matched && mentioned) {
    return `Não achei ${mentioned} na equipe. Profissionais ativas: ${names.join(", ") || "nenhuma cadastrada"}.`;
  }
  if (matched) {
    const booked = bookedFor(snapshot, matched.name);
    const bookedLine = bookedSummary(booked);
    if (!matched.freeSlots.length) {
      return [`${matched.name} não tem horário livre ${snapshot.dayLabel} na grade do salão.`, bookedLine]
        .filter(Boolean)
        .join(" ");
    }
    return [
      `Sim. ${matched.name} tem ${matched.freeSlots.length} horário(s) livre(s) ${snapshot.dayLabel}: ${summarizeSlots(matched.freeSlots)}.`,
      bookedLine,
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (!snapshot.professionals.length) {
    return "Não há profissionais ativos para consultar horário livre.";
  }
  const lines = snapshot.professionals.map((row) =>
    row.freeSlots.length
      ? `- ${row.name}: ${summarizeSlots(row.freeSlots, 5)}`
      : `- ${row.name}: sem horário livre ${snapshot.dayLabel}`,
  );
  return [`Horários livres ${snapshot.dayLabel}:`, ...lines].join("\n");
}

export function answerIdleTeam(snapshot: AssistantSnapshot) {
  const idle = idleProfessionals(snapshot.professionals);
  if (!snapshot.professionals.length) {
    return "Não há profissionais ativos cadastrados para cruzar com a agenda de hoje.";
  }
  if (!idle.length) {
    return `Nenhuma profissional está ociosa ${snapshot.dayLabel}: todas têm pelo menos um horário na agenda.`;
  }
  return `Sem cliente ${snapshot.dayLabel}: ${idle.map((row) => row.name).join(", ")}. Dá para encaixar retorno ou uma promoção do dia fraco.`;
}

export function answerRevenue(snapshot: AssistantSnapshot) {
  return `O faturamento de hoje em ${snapshot.salon} está em ${formatBRL(snapshot.revenueCents)}.`;
}

export function answerAssistantIntent(intent: AssistantIntent, snapshot: AssistantSnapshot, question = "") {
  if (intent === "low_stock") return answerLowStock(snapshot.products);
  if (intent === "today_agenda") return answerTodayAgenda(snapshot);
  if (intent === "free_slot") return answerFreeSlots(snapshot, question);
  if (intent === "idle_team") return answerIdleTeam(snapshot);
  if (intent === "revenue") return answerRevenue(snapshot);
  return "";
}

export function formatAssistantContext(snapshot: AssistantSnapshot) {
  const low = lowStockProducts(snapshot.products);
  const idle = idleProfessionals(snapshot.professionals);
  const agenda =
    snapshot.appointments
      .map((row) => `${row.time} ${row.client} com ${row.professional} (${row.status})`)
      .join("; ") || "nenhum horário";
  return [
    `Salão: ${snapshot.salon}`,
    `Faturamento de hoje: ${formatBRL(snapshot.revenueCents)}`,
    `Agendamentos hoje: ${snapshot.appointments.length}`,
    `Ocupação estimada: ${snapshot.occupancy}%`,
    `No-shows: ${snapshot.noShows}`,
    `Produtos ativos: ${snapshot.products.length}`,
    `Produtos em baixa: ${low.length}`,
    low.length ? `Lista em baixa:\n${low.map((item) => formatLowStockLine(item)).join("\n")}` : "Lista em baixa: nenhum",
    `Agenda ${snapshot.dayLabel}: ${agenda}`,
    idle.length
      ? `Equipe ociosa ${snapshot.dayLabel}: ${idle.map((row) => row.name).join(", ")}`
      : `Equipe ociosa ${snapshot.dayLabel}: nenhuma`,
    `Horários livres ${snapshot.dayLabel}:`,
    ...snapshot.professionals.map((row) =>
      row.freeSlots.length
        ? `- ${row.name}${row.nickname ? ` (${row.nickname})` : ""}: ${summarizeSlots(row.freeSlots, 10)}`
        : `- ${row.name}${row.nickname ? ` (${row.nickname})` : ""}: nenhum`,
    ),
  ].join("\n");
}

export const ASSISTANT_SYSTEM_PROMPT =
  "Você é a assistente operacional do MegaBeauty, CRM de salão no Brasil. Responda em português, de forma direta, com nomes e números do contexto. Se a pergunta for sobre estoque baixo, horário livre, agenda de uma profissional, faturamento ou equipe ociosa, liste os itens do contexto. Nunca diga que não tem a informação ou para abrir a agenda se o dado já está no contexto. Horários livres de cada profissional estão listados no contexto. Se o contexto não tiver o dado, diga isso em uma frase. Sem enrolação.";
