export type LandingCatalogIcon =
  | "agenda"
  | "atendimento"
  | "comandas"
  | "clientes"
  | "anamnese"
  | "equipe"
  | "usuarios"
  | "servicos"
  | "estoque"
  | "fornecedores"
  | "promocoes"
  | "cadastros"
  | "painel"
  | "financeiro"
  | "comissoes"
  | "metas"
  | "notas"
  | "cashback"
  | "marketing"
  | "documentacao"
  | "ia"
  | "avisos"
  | "suporte"
  | "config";

export type LandingCatalogItem = {
  icon: LandingCatalogIcon;
  title: string;
  text: string;
};

export type LandingCatalogGroup = {
  id: string;
  title: string;
  text: string;
  items: LandingCatalogItem[];
};

export const LANDING_AUDIENCES = ["Salões de beleza", "Barbearias", "Clínicas de estética"] as const;

export const LANDING_STEPS = [
  {
    title: "Abra a conta do salão",
    text: "Cadastro em poucos minutos. Já entra com agenda, clientes e caixa prontos para usar.",
  },
  {
    title: "Monte a operação",
    text: "Equipe, serviços, estoque e WhatsApp no mesmo lugar. Importe as clientes se quiser.",
  },
  {
    title: "Atenda e fature",
    text: "A cliente marca sozinha, a comanda fecha certo e o dono vê o dia sem planilha.",
  },
] as const;

export const LANDING_CATALOG: LandingCatalogGroup[] = [
  {
    id: "atendimento",
    title: "Atendimento",
    text: "Do horário marcado ao fechamento da comanda, sem papel e sem WhatsApp pessoal.",
    items: [
      {
        icon: "agenda",
        title: "Agenda",
        text: "Colunas por profissional, horários livres, sem conflito. A cliente marca sozinha pelo link, 24h.",
      },
      {
        icon: "atendimento",
        title: "Atendimento WhatsApp",
        text: "Inbox único para confirmação, cobrança e conversa. A recepção não usa o celular pessoal.",
      },
      {
        icon: "comandas",
        title: "Comandas",
        text: "Serviço, produto, pacote e pagamento na mesma comanda. Comissão e estoque já saem certos.",
      },
      {
        icon: "clientes",
        title: "Clientes",
        text: "Ficha, histórico, pacotes, busca e importação. A recepção acha a cliente em segundos.",
      },
      {
        icon: "anamnese",
        title: "Anamnese",
        text: "Formulários por serviço, alertas e documento com a logo do salão para assinar.",
      },
    ],
  },
  {
    id: "operacao",
    title: "Operação",
    text: "Equipe, serviços, estoque e fornecedores no mesmo ritmo do atendimento.",
    items: [
      {
        icon: "equipe",
        title: "Equipe",
        text: "Profissionais, jornada e comissão de cada um, ligados à agenda e à comanda.",
      },
      {
        icon: "usuarios",
        title: "Usuários",
        text: "Dono, recepção e permissões. Cada um vê só o que precisa no dia.",
      },
      {
        icon: "servicos",
        title: "Serviços",
        text: "Preço, duração, comissão, cashback e o que aparece no agendamento online.",
      },
      {
        icon: "estoque",
        title: "Estoque",
        text: "Categorias, lotes, baixa automática no atendimento e alerta de mínimo.",
      },
      {
        icon: "fornecedores",
        title: "Fornecedores",
        text: "Catálogo, pedido e entrada no estoque sem planilha e sem WhatsApp do representante.",
      },
      {
        icon: "promocoes",
        title: "Promoções",
        text: "Desconto por período ou dia da semana, valendo na comanda e no agendamento online.",
      },
      {
        icon: "cadastros",
        title: "Cadastros",
        text: "Contas, categorias financeiras e formas de pagamento do salão, prontos para o caixa.",
      },
    ],
  },
  {
    id: "gestao",
    title: "Gestão",
    text: "O dono vê o dia, a meta e o caixa sem montar relatório na mão.",
    items: [
      {
        icon: "painel",
        title: "Painel",
        text: "Faturamento, ticket, conversão e mapa de calor dos horários que mais vendem.",
      },
      {
        icon: "financeiro",
        title: "Financeiro",
        text: "A pagar, a receber, caixa e movimento do dia — separado do bolso da casa.",
      },
      {
        icon: "comissoes",
        title: "Comissões",
        text: "Por serviço, profissional e período. Sem cálculo no caderno no fim do mês.",
      },
      {
        icon: "metas",
        title: "Metas",
        text: "Acompanha a meta da casa e de cada profissional enquanto o dia acontece.",
      },
      {
        icon: "notas",
        title: "Notas fiscais",
        text: "Emissão, XML e PDF no mesmo fluxo da comanda, sem sistema paralelo.",
      },
      {
        icon: "cashback",
        title: "Cashback",
        text: "Pontos que voltam na próxima visita, com regra por serviço ou produto.",
      },
    ],
  },
  {
    id: "crescimento",
    title: "Crescimento",
    text: "A cliente volta, o time segue o procedimento e o salão não depende de um celular.",
    items: [
      {
        icon: "marketing",
        title: "Marketing",
        text: "Campanhas no WhatsApp no horário certo: aniversário, retorno, falta e promoção do dia.",
      },
      {
        icon: "documentacao",
        title: "Documentação e POPs",
        text: "Procedimentos, QR e arquivo do salão. O time segue o padrão, não o recado no grupo.",
      },
      {
        icon: "ia",
        title: "Assistente IA",
        text: "Ajuda a operação sem sair do sistema — do texto ao próximo passo do atendimento.",
      },
      {
        icon: "avisos",
        title: "Avisos",
        text: "Comunicados da equipe no sino do painel, sem perder recado no WhatsApp.",
      },
      {
        icon: "suporte",
        title: "Suporte",
        text: "Ticket e chamada de dentro do salão, com histórico para o time da plataforma.",
      },
      {
        icon: "config",
        title: "Configurações",
        text: "Horário, unidade, marca do salão e integrações — tudo no mesmo cadastro.",
      },
    ],
  },
];

export function landingCatalogItems() {
  return LANDING_CATALOG.flatMap((group) => group.items);
}

export function landingCatalogTitles() {
  return landingCatalogItems().map((item) => item.title);
}
