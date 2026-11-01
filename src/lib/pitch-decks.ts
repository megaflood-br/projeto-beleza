export type PitchSlideKind = "cover" | "statement" | "grid" | "split" | "steps" | "close";

export type PitchItem = {
  title: string;
  text: string;
};

export type PitchSlide = {
  kind: PitchSlideKind;
  kicker?: string;
  title: string;
  text?: string;
  items?: PitchItem[];
};

export type PitchDeck = {
  slug: "salao" | "fornecedores" | "parceiros";
  audience: string;
  label: string;
  summary: string;
  cta: string;
  ctaHref: string;
  slides: PitchSlide[];
};

export const PITCH_DECKS: PitchDeck[] = [
  {
    slug: "salao",
    audience: "Salão",
    label: "Para a dona do salão",
    summary: "Agenda, caixa e clientes em um só sistema — sem planilha e sem WhatsApp pessoal.",
    cta: "Criar minha conta",
    ctaHref: "/cadastro",
    slides: [
      {
        kind: "cover",
        kicker: "MegaBeauty · Salões, barbearias e clínicas",
        title: "Pare de gerir o salão no WhatsApp da recepção.",
        text: "Agenda, comanda, estoque e clientes. Um sistema. Um lugar.",
      },
      {
        kind: "statement",
        kicker: "O problema",
        title: "Caderno, planilha e celular pessoal não são gestão.",
        text: "Horário marcado no Instagram. Comissão no fim do mês. Cliente some e ninguém cobra o retorno.",
      },
      {
        kind: "grid",
        kicker: "O que sangra o dia",
        title: "O salão perde dinheiro no improviso.",
        items: [
          { title: "Agenda no recado", text: "Dois profissionais no mesmo horário. Encaixe no grupo. Cliente na porta sem cadeira." },
          { title: "Comissão no caderno", text: "Fecha o mês no feeling. A profissional não confia. O dono também não." },
          { title: "Estoque some", text: "Produto sai no atendimento e ninguém dá baixa. Compra de emergência no sábado." },
          { title: "Cliente some", text: "Sem histórico, sem retorno, sem aniversário. A cadeira vazia vira dia fraco." },
        ],
      },
      {
        kind: "split",
        kicker: "A virada",
        title: "Um sistema para o dia inteiro do salão.",
        text: "Do horário marcado ao caixa fechado, sem papel e sem retrabalho.",
        items: [
          { title: "Agenda", text: "Colunas por profissional, sem conflito. A cliente marca sozinha, 24h." },
          { title: "Atendimento", text: "WhatsApp do salão, comanda e anamnese no mesmo fluxo." },
          { title: "Operação", text: "Equipe, serviço, estoque e promoção no ritmo da cadeira." },
          { title: "Gestão", text: "Faturamento, meta, comissão e financeiro — o dono vê o dia." },
        ],
      },
      {
        kind: "split",
        kicker: "Agenda",
        title: "Lotada. Sem conflito. Aberta 24h.",
        text: "A recepção para de ficar de pingue-pongue no WhatsApp para marcar horário.",
        items: [
          { title: "Coluna por profissional", text: "Cada uma vê o próprio dia. O salão vê a casa inteira." },
          { title: "Link de agendamento", text: "A cliente escolhe serviço, profissional e horário pelo celular." },
          { title: "Encaixe com regra", text: "O sistema bloqueia choque de horário. Não a memória da recepção." },
        ],
      },
      {
        kind: "split",
        kicker: "WhatsApp",
        title: "O WhatsApp do salão. Não o da recepção.",
        text: "Confirmação, cobrança e conversa no mesmo inbox. O celular pessoal fica pessoal.",
        items: [
          { title: "Inbox único", text: "A conversa fica no salão, mesmo quando a recepção troca." },
          { title: "Campanha na hora certa", text: "Aniversário, retorno, falta e promoção do dia fraco." },
          { title: "Perfil da cliente ao lado", text: "Histórico e próximo horário enquanto você responde." },
        ],
      },
      {
        kind: "grid",
        kicker: "Comanda",
        title: "Fecha a comanda. O resto já sai certo.",
        items: [
          { title: "Serviço e produto", text: "Pacote, desconto e pagamento na mesma conta." },
          { title: "Comissão", text: "Por profissional e por serviço. Sem cálculo no domingo." },
          { title: "Estoque", text: "Baixa automática no atendimento. Alerta de mínimo." },
          { title: "Nota fiscal", text: "XML e PDF no fluxo da comanda, sem sistema paralelo." },
        ],
      },
      {
        kind: "split",
        kicker: "Cliente",
        title: "A cliente some quando o salão esquece dela.",
        text: "Ficha, anamnese, pacote e cashback — a próxima visita já começa na anterior.",
        items: [
          { title: "Histórico completo", text: "O que fez, o que comprou, o que deve voltar." },
          { title: "Anamnese com logo", text: "Formulário por serviço e documento para assinar." },
          { title: "Cashback e promoção", text: "Pontos que voltam. Desconto no dia que a agenda esvazia." },
        ],
      },
      {
        kind: "grid",
        kicker: "Dono",
        title: "O dono vê o dia em segundos.",
        items: [
          { title: "Painel", text: "Faturamento, ticket e mapa de calor dos horários que mais vendem." },
          { title: "Metas", text: "Da casa e de cada profissional, enquanto o dia acontece." },
          { title: "Financeiro", text: "A pagar, a receber e caixa — separado do bolso da casa." },
          { title: "Assistente IA", text: "Pergunte o estoque em baixa ou o horário livre da Kelly." },
        ],
      },
      {
        kind: "steps",
        kicker: "Começa hoje",
        title: "Três passos. O salão já opera.",
        items: [
          { title: "Abra a conta", text: "Cadastro em minutos. Agenda, clientes e caixa prontos." },
          { title: "Monte a operação", text: "Equipe, serviços, estoque e WhatsApp. Importe as clientes se quiser." },
          { title: "Atenda e fature", text: "A cliente marca sozinha. A comanda fecha certo. O dono vê o dia." },
        ],
      },
      {
        kind: "close",
        kicker: "MegaBeauty",
        title: "Menos retrabalho. Mais cadeira ocupada.",
        text: "Crie a conta agora e organize o salão no mesmo dia.",
      },
    ],
  },
  {
    slug: "fornecedores",
    audience: "Fornecedor",
    label: "Para quem vende produto ao salão",
    summary: "Catálogo, pedido e reposição dentro do estoque de cada salão — sem WhatsApp do representante.",
    cta: "Quero meu canal de fornecedor",
    ctaHref: "/",
    slides: [
      {
        kind: "cover",
        kicker: "MegaBeauty · Fornecedores de produtos",
        title: "Seu produto no estoque de cada salão.",
        text: "Sem planilha. Sem grupo de WhatsApp. Sem pedido que some no meio do caminho.",
      },
      {
        kind: "statement",
        kicker: "O problema",
        title: "O pedido ainda nasce no recado e morre na planilha.",
        text: "O representante manda tabela. O salão esquece. Você só descobre quando o concorrente já repôs.",
      },
      {
        kind: "grid",
        kicker: "Onde a venda trava",
        title: "Você não perde no produto. Perde no canal.",
        items: [
          { title: "Catálogo desatualizado", text: "Preço velho no PDF. Foto no Drive. Ninguém sabe o que tem." },
          { title: "Pedido no zap", text: "Lista no áudio. Confirmação no print. Erro na entrega." },
          { title: "Salão esquece de repor", text: "O produto acabou na sexta. A compra vai para quem cobrou primeiro." },
          { title: "Zero visibilidade", text: "Você não vê o giro. O salão não vê o seu canal. Os dois improvisam." },
        ],
      },
      {
        kind: "split",
        kicker: "A virada",
        title: "Você entra no ritmo do atendimento.",
        text: "Quando o salão usa o produto, o estoque baixa. Quando chega no mínimo, o aviso aparece.",
        items: [
          { title: "Canal no sistema", text: "Sua empresa aparece no módulo de fornecedores do salão." },
          { title: "Pedido que vira estoque", text: "O que o salão pede entra na casa dele sem digitação dupla." },
          { title: "Promoção no ponto certo", text: "Oferta visível para quem já compra de você, no dia da reposição." },
        ],
      },
      {
        kind: "split",
        kicker: "Catálogo",
        title: "Seu catálogo, do seu jeito.",
        text: "Produto, foto, preço e status. O salão compra o que está vivo — não o PDF da semana passada.",
        items: [
          { title: "Vitrine da marca", text: "Nome, apresentação e o que o salão precisa ver para pedir de novo." },
          { title: "Itens ativos", text: "Liga e desliga sem republicar tabela." },
          { title: "Promoção", text: "Campanha por período, visível no canal do salão." },
        ],
      },
      {
        kind: "split",
        kicker: "Pedido",
        title: "O pedido vira entrada. Não vira planilha.",
        text: "O salão pede de dentro do sistema. Você vê o pedido. O estoque dele sobe quando chega.",
        items: [
          { title: "Um fluxo só", text: "Sem copiar item do WhatsApp para o Excel." },
          { title: "Histórico", text: "O que cada salão pediu fica no canal, não no celular do representante." },
          { title: "Menos erro", text: "Quantidade e produto certos. Entrega menos bagunçada." },
        ],
      },
      {
        kind: "statement",
        kicker: "Recompra",
        title: "Estoque baixo é pedido esperando.",
        text: "O salão vê o aviso de mínimo. Você está no lugar certo, na hora em que ele precisa repor.",
      },
      {
        kind: "grid",
        kicker: "Por que MegaBeauty",
        title: "Uma rede de salões já no mesmo sistema.",
        items: [
          { title: "Onde o giro acontece", text: "O estoque baixa no atendimento — não numa planilha paralela." },
          { title: "Marca no canal", text: "Sua empresa deixa de ser mais um contato no WhatsApp." },
          { title: "Pedido com rastro", text: "Do clique à entrada, sem recado perdido." },
          { title: "Escala", text: "Um catálogo. Vários salões. O mesmo jeito de vender." },
        ],
      },
      {
        kind: "close",
        kicker: "MegaBeauty Fornecedores",
        title: "Pare de vender só no grupo de WhatsApp.",
        text: "Peça seu canal e coloque o catálogo dentro do estoque de quem já atende todo dia.",
      },
    ],
  },
  {
    slug: "parceiros",
    audience: "Parceiro",
    label: "Para influenciadores que vendem o sistema",
    summary: "White label, landing própria e comissão em todo salão que assinar pelo seu link.",
    cta: "Quero ser parceira",
    ctaHref: "/",
    slides: [
      {
        kind: "cover",
        kicker: "MegaBeauty · Influenciadores e parceiros",
        title: "Venda o sistema com a sua marca.",
        text: "O salão assina. Você ganha. A operação continua com a sua cara.",
      },
      {
        kind: "statement",
        kicker: "O jogo",
        title: "Indicar e esquecer não é negócio. White label é.",
        text: "Quem já tem a confiança do salão não precisa virar suporte. Precisa de marca, link e comissão.",
      },
      {
        kind: "split",
        kicker: "Para quem",
        title: "Para quem o salão já escuta.",
        text: "Influenciadora, consultora, educadora, revendedora. Quem indica de verdade — e pode cobrar por isso.",
        items: [
          { title: "Audiência certa", text: "Dona de salão, recepção e profissional que decide ferramenta." },
          { title: "Confiança pronta", text: "Você já ensina, já indica produto. Agora indica o sistema." },
          { title: "Sem virar plantão", text: "A plataforma opera. Você abre a porta e acompanha a comissão." },
        ],
      },
      {
        kind: "grid",
        kicker: "White label",
        title: "A marca é sua. O motor é MegaBeauty.",
        items: [
          { title: "Logo e cor", text: "Login, cadastro, menu e botões com a sua identidade." },
          { title: "Dois logos", text: "Um para fundo claro. Um para fundo escuro. Sem logo esticado." },
          { title: "Domínio próprio", text: "O salão entra pelo seu endereço, não pelo nosso." },
          { title: "Landing sua", text: "Texto, imagem e oferta com a sua voz. O cadastro já vem com a sua referência." },
        ],
      },
      {
        kind: "split",
        kicker: "Atribuição",
        title: "Um link. O salão já nasce seu.",
        text: "Primeiro toque vale. Quem cadastrou pelo seu canal fica na sua carteira.",
        items: [
          { title: "Link com referência", text: "Cadastro, landing e domínio próprio carregam o seu código." },
          { title: "First-touch", text: "Ninguém fura a fila depois. A origem fica gravada." },
          { title: "Painel do parceiro", text: "Clientes, links, aparência e financeiro num só lugar." },
        ],
      },
      {
        kind: "statement",
        kicker: "Comissão",
        title: "Você ganha enquanto o salão usa.",
        text: "Não é um pix de indicação e sumiu. É recorrência com extrato, saldo e saque no seu painel.",
      },
      {
        kind: "grid",
        kicker: "O que você vende",
        title: "Você não vende software. Vende o dia do salão resolvido.",
        items: [
          { title: "Agenda sem conflito", text: "A cliente marca sozinha. A profissional para de brigar por horário." },
          { title: "WhatsApp do salão", text: "A recepção larga o celular pessoal." },
          { title: "Comissão certa", text: "O dono para de fechar o mês no caderno." },
          { title: "Estoque que baixa sozinho", text: "O produto usado no atendimento some da prateleira certa." },
        ],
      },
      {
        kind: "steps",
        kicker: "Como fechar",
        title: "Três movimentos. Sem enrolação.",
        items: [
          { title: "Mostre a dor", text: "Agenda no zap, comissão no caderno, cliente que some. Eles já vivem isso." },
          { title: "Abra a sua landing", text: "Marca sua, oferta sua, botão de cadastro com o seu link." },
          { title: "Acompanhe no painel", text: "Quem entrou, o que faturou, o que tem para receber." },
        ],
      },
      {
        kind: "split",
        kicker: "Por que converte",
        title: "O salão já sofre isso todo dia.",
        text: "Você não precisa inventar urgência. Precisa chegar com a solução e a sua cara.",
        items: [
          { title: "Dor óbvia", text: "Todo salão sente falta, encaixe e fechamento bagunçado." },
          { title: "Prova na tela", text: "A landing e o sistema mostram o dia organizado — não um PDF." },
          { title: "Você no meio", text: "A marca que eles já seguem é a porta de entrada." },
        ],
      },
      {
        kind: "close",
        kicker: "MegaBeauty Parceiros",
        title: "Sua audiência. Sua marca. Sua comissão.",
        text: "Peça seu canal white label e comece a vender o sistema com o seu nome.",
      },
    ],
  },
];

export function listPitchDecks() {
  return PITCH_DECKS.map(({ slug, audience, label, summary }) => ({ slug, audience, label, summary }));
}

export function getPitchDeck(slug: string) {
  return PITCH_DECKS.find((deck) => deck.slug === slug) ?? null;
}

export function pitchDeckSlugs() {
  return PITCH_DECKS.map((deck) => deck.slug);
}
