export const WHATSAPP_TABS = [
  { id: "inbox", label: "Inbox", description: "Conversas do número do salão." },
  { id: "campanhas", label: "Campanhas", description: "Mensagens automáticas de aniversário, lembrete, retorno e cobrança." },
  { id: "conexao", label: "Conexão", description: "QR Code e status do WhatsApp do salão." },
] as const;

export type WhatsAppTab = (typeof WHATSAPP_TABS)[number]["id"];

export function isWhatsAppTab(value: string | undefined): value is WhatsAppTab {
  return WHATSAPP_TABS.some((tab) => tab.id === value);
}

export function parseWhatsAppTab(value?: string | null): WhatsAppTab {
  return value && isWhatsAppTab(value) ? value : "inbox";
}

export const CAMPAIGN_TRIGGERS = [
  "BIRTHDAY",
  "WINBACK",
  "REMINDER",
  "NURTURE",
  "RETURN",
  "INFORMED",
  "WELCOME",
  "BOOK_ONLINE",
  "CASHBACK",
  "PACKAGE_EXPIRING",
  "CHARGE",
  "REVIEW",
  "PIN",
] as const;

export type CampaignTrigger = (typeof CAMPAIGN_TRIGGERS)[number];

export type CampaignDefinition = {
  trigger: CampaignTrigger;
  title: string;
  description: string;
  icon: string;
  defaultActive: boolean;
  template: string;
};

const LEGACY_TRIGGERS: Record<string, CampaignTrigger> = {
  APPOINTMENT_CREATED: "INFORMED",
  REMINDER: "REMINDER",
  INACTIVE: "WINBACK",
};

export function normalizeCampaignTrigger(value: string): CampaignTrigger | null {
  if ((CAMPAIGN_TRIGGERS as readonly string[]).includes(value)) return value as CampaignTrigger;
  return LEGACY_TRIGGERS[value] ?? null;
}

export const CAMPAIGN_CATALOG: CampaignDefinition[] = [
  {
    trigger: "BIRTHDAY",
    title: "Parabenize seus clientes",
    description: "Reforce o laço com seus clientes e receba o quanto eles são especiais. Envie uma mensagem automática parabenizando o aniversariante do dia.",
    icon: "gift",
    defaultActive: false,
    template: "Oi {{nome}}! Feliz aniversário! 🎉 O {{salao}} preparou um mimo para você. Que tal comemorar com a gente?",
  },
  {
    trigger: "WINBACK",
    title: "Reconquiste clientes",
    description: "Já faz um tempo que o cliente não vem? Recupere quem sumiu com uma campanha para quem não retornou depois de um período.",
    icon: "user",
    defaultActive: true,
    template: "Sentimos sua falta, {{nome}}! Que tal um horário esta semana no {{salao}}? Temos novidades para você.",
  },
  {
    trigger: "REMINDER",
    title: "Evite esquecimentos",
    description: "No corre do dia a dia o cliente pode esquecer o horário. Evite falta com um lembrete personalizado no dia do agendamento.",
    icon: "bell",
    defaultActive: true,
    template: "Oi {{nome}}, lembrando do seu horário hoje às {{hora}} no {{salao}}{{profissional}}. Te esperamos!",
  },
  {
    trigger: "NURTURE",
    title: "Cuide dos relacionamentos",
    description: "Fortaleça o relacionamento enviando uma mensagem depois do atendimento. Essas mensagens vão apenas para o agendamento concluído.",
    icon: "heart",
    defaultActive: false,
    template: "Oi {{nome}}, obrigado por vir ao {{salao}}! Qualquer coisa é só chamar. Foi um prazer te atender.",
  },
  {
    trigger: "RETURN",
    title: "Garanta retornos",
    description: "Já passou o tempo e está na hora do cliente voltar para fazer de novo o serviço. Esta campanha lembra quem ainda não retornou.",
    icon: "rotate",
    defaultActive: true,
    template: "Oi {{nome}}! Já está na hora de retocar no {{salao}}. Quer que eu reserve um horário para você?",
  },
  {
    trigger: "INFORMED",
    title: "Cliente bem informado",
    description: "Atualize o cliente sobre o agendamento: horário marcado, mudança ou status. Evite mensagens manuais a cada alteração.",
    icon: "calendar",
    defaultActive: true,
    template: "Oi {{nome}}! Seu horário no {{salao}} está marcado para {{data}} às {{hora}}{{profissional}}. Responda SIM para confirmar.",
  },
  {
    trigger: "WELCOME",
    title: "Boas-vindas a novos clientes",
    description: "Que tal dar boas-vindas e oferecer um desconto no primeiro atendimento? Esta campanha é enviada no cadastro ou na primeira compra.",
    icon: "sparkles",
    defaultActive: false,
    template: "Bem-vindo ao {{salao}}, {{nome}}! Que bom ter você com a gente. Qualquer dúvida, é só responder esta mensagem.",
  },
  {
    trigger: "BOOK_ONLINE",
    title: "Convide o cliente para agendar online",
    description: "Incentive o cliente a marcar sozinho pelo link. Esta campanha envia o endereço do agendamento online.",
    icon: "link",
    defaultActive: false,
    template: "Oi {{nome}}! Agora você agenda no {{salao}} pelo celular: {{link}}",
  },
  {
    trigger: "CASHBACK",
    title: "Cashback",
    description: "Envie ao cliente uma mensagem avisando o saldo ou a atualização de cashback.",
    icon: "coins",
    defaultActive: false,
    template: "Oi {{nome}}! Você ganhou {{valor}} de cashback no {{salao}}. Use no próximo horário!",
  },
  {
    trigger: "PACKAGE_EXPIRING",
    title: "Pacote expirando",
    description: "Avise o cliente que o pacote está acabando ou perto do vencimento.",
    icon: "package",
    defaultActive: false,
    template: "Oi {{nome}}, seu pacote {{servico}} no {{salao}} está acabando. Vamos renovar?",
  },
  {
    trigger: "CHARGE",
    title: "Realize cobranças",
    description: "Se o cliente deixou uma comanda em aberto, cobre com uma mensagem automática pedindo para quitar.",
    icon: "receipt",
    defaultActive: false,
    template: "Oi {{nome}}, ficou um valor de {{valor}} em aberto no {{salao}}. Quando puder, a gente acerta?",
  },
  {
    trigger: "REVIEW",
    title: "Solicite avaliações dos clientes",
    description: "Peça um depoimento depois do atendimento e aumente a credibilidade do salão.",
    icon: "star",
    defaultActive: true,
    template: "Oi {{nome}}, gostou do atendimento no {{salao}}? Sua avaliação nos ajuda muito. Responde com uma nota de 1 a 5?",
  },
  {
    trigger: "PIN",
    title: "Enviar código PIN",
    description: "Envie o código PIN pelo WhatsApp, facilitando o acesso ao agendamento online.",
    icon: "key",
    defaultActive: true,
    template: "Seu código PIN do {{salao}} é {{pin}}. Use para acessar o agendamento online.",
  },
];

export const CAMPAIGN_VARIABLES = [
  { key: "nome", label: "Nome do cliente" },
  { key: "salao", label: "Nome do salão" },
  { key: "data", label: "Data" },
  { key: "hora", label: "Hora" },
  { key: "profissional", label: "Profissional" },
  { key: "servico", label: "Serviço ou pacote" },
  { key: "valor", label: "Valor" },
  { key: "link", label: "Link de agendamento" },
  { key: "pin", label: "Código PIN" },
] as const;

export function campaignByTrigger(trigger: string) {
  const id = normalizeCampaignTrigger(trigger);
  return CAMPAIGN_CATALOG.find((item) => item.trigger === id) ?? null;
}

export function renderCampaignTemplate(template: string, vars: Record<string, string | null | undefined>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    if (key === "profissional") {
      const name = String(value ?? "").trim();
      return name ? ` com ${name}` : "";
    }
    return String(value ?? "").trim();
  }).replace(/\s{2,}/g, " ").trim();
}

export function bookingLink(publicAppUrl: string, slug: string) {
  const base = publicAppUrl.replace(/\/$/, "");
  return base ? `${base}/agendar/${slug}` : `/agendar/${slug}`;
}

export function appointmentPin(appointmentId: string) {
  return appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "0000";
}
