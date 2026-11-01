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
  client: string;
  professional: string;
  status: string;
};

export type AssistantProfessional = {
  name: string;
  appointmentsToday: number;
};

export type AssistantSnapshot = {
  salon: string;
  revenueCents: number;
  occupancy: number;
  noShows: number;
  appointments: AssistantAppointment[];
  products: AssistantProduct[];
  professionals: AssistantProfessional[];
};

export type AssistantIntent = "greeting" | "low_stock" | "today_agenda" | "idle_team" | "revenue" | "general";

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

export function assistantIntent(question: string): AssistantIntent {
  const q = fold(question);
  if (!q) return "greeting";
  if (
    /(estoque|produto).*(baixa|baixo|minimo|acab|falta|repor|zerad)/.test(q) ||
    /(baixa|baixo|minimo|acab|falta|repor|zerad).*(estoque|produto)/.test(q) ||
    /quais? produtos?( estao| esta)?( em)? (baixa|acabando)/.test(q)
  ) {
    return "low_stock";
  }
  if (/(agenda|horario|atendimento).*(hoje|agora)|quem (atende|tem horario) hoje/.test(q)) {
    return "today_agenda";
  }
  if (/(ociosa|ocioso|livre|sem cliente|buraco).*(hoje|agenda|profissional)?|(profissional|equipe).*(livre|ociosa|ocioso)/.test(q)) {
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
    return `A agenda de ${snapshot.salon} está vazia hoje. Vale publicar o link de agendamento e avisar as clientes no WhatsApp.`;
  }
  const lines = snapshot.appointments.map(
    (row) => `- ${row.time} ${row.client} com ${row.professional} (${row.status})`,
  );
  return [`Hoje há ${snapshot.appointments.length} horário(s):`, ...lines].join("\n");
}

export function answerIdleTeam(snapshot: AssistantSnapshot) {
  const idle = idleProfessionals(snapshot.professionals);
  if (!snapshot.professionals.length) {
    return "Não há profissionais ativos cadastrados para cruzar com a agenda de hoje.";
  }
  if (!idle.length) {
    return "Nenhuma profissional está ociosa hoje: todas têm pelo menos um horário na agenda.";
  }
  return `Sem cliente hoje: ${idle.map((row) => row.name).join(", ")}. Dá para encaixar encaixe, retorno ou uma promoção do dia fraco.`;
}

export function answerRevenue(snapshot: AssistantSnapshot) {
  return `O faturamento de hoje em ${snapshot.salon} está em ${formatBRL(snapshot.revenueCents)}.`;
}

export function answerAssistantIntent(intent: AssistantIntent, snapshot: AssistantSnapshot) {
  if (intent === "low_stock") return answerLowStock(snapshot.products);
  if (intent === "today_agenda") return answerTodayAgenda(snapshot);
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
    `Agenda: ${agenda}`,
    idle.length ? `Equipe ociosa hoje: ${idle.map((row) => row.name).join(", ")}` : "Equipe ociosa hoje: nenhuma",
  ].join("\n");
}

export const ASSISTANT_SYSTEM_PROMPT =
  "Você é a assistente operacional do MegaBeauty, CRM de salão no Brasil. Responda em português, de forma direta, com nomes e números do contexto. Se a pergunta for sobre estoque baixo, agenda, faturamento ou equipe ociosa, liste os itens. Nunca diga para a pessoa olhar o estoque, abrir um módulo ou conferir a tela se o dado já está no contexto. Se o contexto não tiver o dado, diga isso em uma frase. Sem enrolação.";
