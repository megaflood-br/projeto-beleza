import OpenAI from "openai";

export function createOpenAI(apiKey?: string | null) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function fallbackInsight(stats: {
  revenueCents: number;
  appointments: number;
  occupancy: number;
  noShows: number;
  lowStock: number;
}) {
  const hints: string[] = [];
  if (stats.occupancy < 55) {
    hints.push(
      "A ocupação da agenda está abaixo de 55%. Vale disparar uma campanha de horários ociosos no WhatsApp para as profissionais com mais buracos.",
    );
  } else {
    hints.push("A ocupação está saudável. Foque em upsell de pacotes nas clientes recorrentes desta semana.");
  }
  if (stats.noShows > 0) {
    hints.push(
      `Houve ${stats.noShows} não comparecimento(s). Ative o lembrete automático 24h antes e peça confirmação com um toque.`,
    );
  }
  if (stats.lowStock > 0) {
    hints.push(`${stats.lowStock} produto(s) estão no estoque mínimo. Reponha antes do pico de sábado.`);
  }
  if (stats.appointments === 0) {
    hints.push("Agenda vazia hoje. Publique o link de agendamento online nos stories e no WhatsApp Business.");
  }
  return hints.join(" ");
}

export async function chatWithSalonContext(params: {
  apiKey?: string | null;
  question: string;
  context: string;
}) {
  const client = createOpenAI(params.apiKey);
  if (!client) {
    return {
      source: "local" as const,
      answer:
        "A OpenAI ainda não está configurada neste salão. Com os dados atuais: " +
        params.context.slice(0, 400) +
        " Configure a chave em Configurações para respostas mais precisas.",
    };
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Você é a assistente da MegaBeauty, um CRM para salões de beleza no Brasil. Responda em português, de forma objetiva, com ações práticas sobre agenda, clientes, estoque, comissões, WhatsApp e faturamento. Use apenas o contexto fornecido.",
      },
      { role: "user", content: `Contexto do salão:\n${params.context}\n\nPergunta: ${params.question}` },
    ],
  });

  return {
    source: "openai" as const,
    answer: completion.choices[0]?.message?.content ?? "Não consegui gerar uma resposta agora.",
  };
}

export async function draftWhatsAppMessage(params: {
  apiKey?: string | null;
  goal: string;
  clientName: string;
  salonName: string;
}) {
  const client = createOpenAI(params.apiKey);
  if (!client) {
    return `Oi ${params.clientName.split(" ")[0]}! Aqui é do ${params.salonName}. ${params.goal} Qualquer coisa é só responder esta mensagem 💛`;
  }
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "Escreva mensagens curtas de WhatsApp em português brasileiro, tom caloroso e profissional, sem emojis em excesso, no máximo 3 frases.",
      },
      {
        role: "user",
        content: `Salão: ${params.salonName}. Cliente: ${params.clientName}. Objetivo: ${params.goal}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}
