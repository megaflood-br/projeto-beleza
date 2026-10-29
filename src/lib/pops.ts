import { formatCnpj } from "@/lib/fiscal";
import { formatPhoneBR, slugify } from "@/lib/utils";

export const POP_KINDS = ["GERAL", "SERVICO"] as const;
export type PopKind = (typeof POP_KINDS)[number];

export const POP_SIGNERS = ["COMPANY", "TECHNICAL"] as const;
export type PopSigner = (typeof POP_SIGNERS)[number];

export type PopTemplate = {
  key: string;
  kind: PopKind;
  signer: PopSigner;
  code: string;
  title: string;
  area: string;
  match?: string[];
  objective: string;
  application: string;
  steps: string[];
  hygiene: string[];
  disposal: string[];
  records: string[];
  references: string[];
  defaultFrequency: string;
  defaultProducts: string;
};

export type SalonCompany = {
  legalName: string;
  tradeName: string;
  document: string;
  address: string;
  city: string;
  uf: string;
  zip: string;
  phone: string;
  email: string;
  ie: string;
  im: string;
};

export function salonCompany(tenant: {
  name: string;
  tradeName?: string | null;
  document?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  fiscalCnpj?: string | null;
  fiscalIe?: string | null;
  fiscalIm?: string | null;
  fiscalUf?: string | null;
  fiscalStreet?: string | null;
  fiscalNumber?: string | null;
  fiscalDistrict?: string | null;
  fiscalZip?: string | null;
}): SalonCompany {
  const street = [tenant.fiscalStreet, tenant.fiscalNumber, tenant.fiscalDistrict].filter(Boolean).join(", ");
  return {
    legalName: tenant.name,
    tradeName: tenant.tradeName?.trim() || tenant.name,
    document: (() => {
      const raw = tenant.fiscalCnpj || tenant.document || "";
      const formatted = formatCnpj(raw);
      return formatted === "—" ? raw : formatted;
    })(),
    address: street || tenant.address || "",
    city: tenant.city || "",
    uf: tenant.fiscalUf || "",
    zip: tenant.fiscalZip || "",
    phone: formatPhoneBR(tenant.phone),
    email: tenant.email || "",
    ie: tenant.fiscalIe || "",
    im: tenant.fiscalIm || "",
  };
}

export function companyLine(company: SalonCompany) {
  return [
    company.legalName,
    company.tradeName && company.tradeName !== company.legalName ? `Nome fantasia: ${company.tradeName}` : "",
    company.document ? `CNPJ ${company.document}` : "",
    company.ie ? `IE ${company.ie}` : "",
    company.im ? `IM ${company.im}` : "",
    [company.address, company.city, company.uf, company.zip].filter(Boolean).join(" · "),
    company.phone !== "—" ? company.phone : "",
    company.email,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function fillPopText(template: string, vars: Record<string, string | null | undefined>) {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => String(vars[key] ?? "").trim())
    .replace(/\s{2,}/g, " ")
    .trim();
}

const REFS_BASE = [
  "RDC ANVISA nº 63/2011 — Boas Práticas de Funcionamento",
  "RDC ANVISA nº 222/2018 — Gerenciamento de resíduos de serviços de saúde",
  "RDC ANVISA nº 15/2012 — Boas práticas para o processamento de produtos para saúde (quando houver esterilização)",
  "NR-32 — Segurança e saúde no trabalho em serviços de saúde (princípios de biossegurança)",
];

function pop(
  partial: Omit<PopTemplate, "references" | "kind" | "signer"> & {
    kind?: PopKind;
    signer?: PopSigner;
    references?: string[];
  },
): PopTemplate {
  return {
    kind: "GERAL",
    signer: "COMPANY",
    references: REFS_BASE,
    ...partial,
  };
}

export function popSignerLabel(signer: PopSigner) {
  return signer === "TECHNICAL" ? "Responsável técnico" : "Responsável da empresa";
}

export function popDisclaimer(signer: PopSigner) {
  if (signer === "TECHNICAL") {
    return "Procedimento de estética. Este POP exige responsável técnico habilitado. Não substitui alvará da Vigilância Sanitária.";
  }
  return "Serviço de salão de beleza. A aprovação é a assinatura do responsável da empresa. Procedimentos de estética exigem responsável técnico nos respectivos POPs.";
}

export const POP_CATALOG: PopTemplate[] = [
  pop({
    key: "lavagem-maos",
    code: "POP-01",
    title: "Higienização e lavagem das mãos",
    area: "Biossegurança",
    objective: "Reduzir a carga microbiana das mãos da equipe antes, durante e após o atendimento, prevenindo infecção cruzada.",
    application: "Todos os profissionais e colaboradores do {{salao}} que tenham contato com cliente, material ou superfície de atendimento.",
    defaultFrequency: "Antes e depois de cada cliente; após contato com sangue, secreção ou resíduo; ao chegar e ao sair.",
    defaultProducts: "Sabão líquido neutro, papel toalha descartável, álcool 70% (quando as mãos estiverem visivelmente limpas).",
    steps: [
      "Retirar anéis, pulseiras e relógio no posto de trabalho.",
      "Abrir a torneira e molhar as mãos com água corrente.",
      "Aplicar sabão líquido e esfregar palmas, dorso, espaços interdigitais, polegares, unhas e punhos por no mínimo 40 a 60 segundos.",
      "Enxaguar com água corrente, do punho para as pontas dos dedos.",
      "Seque com papel toalha descartável e use o mesmo papel para fechar a torneira, se não for acionamento por sensor.",
      "Quando indicado, complementar com fricção de álcool 70% até secar.",
    ],
    hygiene: [
      "Manter unhas curtas, limpas e sem alongamento excessivo no atendimento invasivo ou com risco de perfurocortante.",
      "Reabastecer sabão e papel toalha no início do expediente.",
    ],
    disposal: ["Descartar papel toalha em lixo comum, saco branco leitoso se houver sujidade biológica visível."],
    records: ["Checklist diário de estoque de sabão, papel e álcool 70% no sanitário/área de apoio."],
  }),
  pop({
    key: "ambiente",
    code: "POP-02",
    title: "Limpeza e desinfecção do ambiente",
    area: "Ambiente",
    objective: "Manter o ambiente de trabalho limpo, organizado e desinfetado, reduzindo risco de contaminação.",
    application: "Recepção, salas de atendimento, lavatório, sanitário e área de apoio do {{salao}}.",
    defaultFrequency: "Limpeza concorrente a cada cliente nas superfícies de contato. Limpeza terminal ao final do expediente. Sanitário no mínimo 3 vezes ao dia.",
    defaultProducts: "Detergente neutro, desinfetante de uso hospitalar ou sanitário com registro, álcool 70%, panos de microfibra identificados por área, luva de procedimento.",
    steps: [
      "Recolher resíduos e material descartável da estação.",
      "Limpar do mais limpo para o mais sujo e de cima para baixo.",
      "Lavar superfícies com água e detergente; enxaguar; aplicar desinfetante no tempo de contato indicado pelo fabricante.",
      "Cadeiras, macas, puxadores, interruptores e bancadas: limpar e desinfetar com álcool 70% ou produto equivalente após cada cliente.",
      "Pisos: varrer úmido e passar desinfetante no final do turno.",
      "Registrar o término da limpeza terminal.",
    ],
    hygiene: [
      "Separar panos de chão, bancada e sanitário. Não misturar.",
      "Lavar e secar os panos ao final do dia; não deixar de molho de um dia para o outro.",
    ],
    disposal: ["Resíduos comuns em saco preto. Resíduos com sangue/secreção em saco branco leitoso."],
    records: ["Planilha de limpeza diária (responsável, horário e área)."],
  }),
  pop({
    key: "desinfeccao-materiais",
    code: "POP-03",
    title: "Limpeza e desinfecção de materiais",
    area: "Processamento de artigos",
    objective: "Padronizar a limpeza e a desinfecção de artigos não críticos e semicríticos usados no atendimento.",
    application: "Pincéis, tigelas, espátulas, pentes, escovas, bandejas e demais artigos reutilizáveis do {{salao}}.",
    defaultFrequency: "Imediatamente após cada uso.",
    defaultProducts: "Detergente enzimático ou neutro, escova exclusiva, hipoclorito ou desinfetante de nível intermediário com registro, álcool 70%, caixa plástica identificada (sujo / limpo).",
    steps: [
      "Levar o artigo usado à área suja, com luva.",
      "Pré-enxágue em água corrente para remover restos de produto, cera, esmalte ou secreção.",
      "Imersão em detergente pelo tempo do fabricante.",
      "Escovação de ranhuras e articulações.",
      "Enxágue abundante.",
      "Desinfecção por imersão ou fricção, respeitando concentração e tempo.",
      "Enxágue (se o produto exigir), secagem com papel toalha ou ar e guarda em local limpo e fechado.",
    ],
    hygiene: ["Não processar artigo na mesma pia usada para mãos do cliente, salvo se houver fluxos claramente separados."],
    disposal: ["Restos de produto e água da primeira lavagem: esgoto sanitário. Embalagens de químico: descarte conforme rótulo."],
    records: ["Controle de diluição do desinfetante (data, lote, responsável)."],
  }),
  pop({
    key: "esterilizacao",
    code: "POP-04",
    title: "Esterilização de artigos semicríticos",
    area: "Processamento de artigos",
    objective: "Garantir que alicates, tesouras, pinças e demais artigos que tocam pele não íntegra ou mucosa sejam esterilizados.",
    application: "Alicates de cutícula e unha, tesoura de cutícula, pinça, cureta e artigos equivalentes do {{salao}}.",
    defaultFrequency: "Após cada cliente. Ciclo de autoclave conforme carga montada no dia.",
    defaultProducts: "Detergente enzimático, embalagem grau cirúrgico, fita zebrada, indicador químico, autoclave com manutenção em dia, luva, óculos.",
    steps: [
      "Limpar o artigo conforme POP-03 até estar visivelmente isento de sujidade.",
      "Secar completamente.",
      "Embalar em grau cirúrgico com identificador (conteúdo, data, lote/ciclo, responsável).",
      "Incluir indicador químico interno quando aplicável e fita zebrada externa.",
      "Carregar a autoclave sem sobrepor pacotes. Rodar o ciclo de esterilização conforme manual do equipamento.",
      "Conferir parâmetros (temperatura, pressão, tempo) e virada da fita.",
      "Armazenar pacotes secos, íntegros, em local fechado. Prazo de validade da embalagem: seguir o fabricante (em geral 7 a 30 dias).",
      "Abrir o pacote somente na frente do cliente, no momento do uso.",
    ],
    hygiene: [
      "Artigo sem pacote íntegro, molhado ou com fita sem virar não entra em uso. Reprocessar.",
      "Manutenção preventiva da autoclave conforme fabricante.",
    ],
    disposal: ["Embalagem aberta vai para lixo comum se não houver sujidade biológica."],
    records: ["Livro de ciclo da autoclave (data, hora, parâmetros, resultado do indicador, responsável). Teste biológico periódico."],
  }),
  pop({
    key: "residuos",
    code: "POP-05",
    title: "Manejo de resíduos e perfurocortantes",
    area: "Resíduos",
    objective: "Segregar, acondicionar e destinar resíduos do estabelecimento, com ênfase em perfurocortantes e material biológico.",
    application: "Toda a equipe do {{salao}}.",
    defaultFrequency: "Durante o expediente. Coleta do contrato de RSS conforme agenda da empresa credenciada.",
    defaultProducts: "Coletor rígido amarelo para perfurocortantes, saco branco leitoso, saco preto, lixeiras com tampa e pedal.",
    steps: [
      "Grupo A (potencialmente infectante: algodão, gaze, luva com sangue ou secreção): saco branco leitoso em lixeira identificada.",
      "Grupo E (perfurocortantes: lâmina, agulha, palito, lixa contaminada, ampola): descarte imediato no coletor rígido, até 2/3 da capacidade.",
      "Grupo D (comum): saco preto.",
      "Não recapar agulhas. Não desmontar lâmina com a mão desprotegida.",
      "Fechar o coletor quando atingir o limite, identificar com o nome do {{salao}} e armazenar em local exclusivo até a coleta.",
      "Manter o manifesto/contrato da empresa coletora à disposição da vigilância.",
    ],
    hygiene: ["Lavar as mãos após qualquer descarte. Trocar luva se houver contato com resíduo."],
    disposal: ["É proibido despejar perfurocortante em lixo comum ou sanitário."],
    records: ["Contrato e comprovantes de coleta de RSS. Data da troca do coletor."],
    references: ["RDC ANVISA nº 222/2018", "RDC ANVISA nº 63/2011"],
  }),
  pop({
    key: "acidente-biologico",
    code: "POP-06",
    title: "Conduta em acidente com material biológico",
    area: "Biossegurança",
    objective: "Definir a conduta imediata em corte, picada ou contato de mucosa com sangue ou fluido corporal.",
    application: "Todos os profissionais do {{salao}}.",
    defaultFrequency: "Sempre que ocorrer o evento.",
    defaultProducts: "Água corrente, sabão, solução fisiológica, kit de primeiros socorros, ficha de ocorrência.",
    steps: [
      "Interromper o atendimento com segurança.",
      "Pele: lavar com água e sabão, sem espremer nem aplicar cáustico.",
      "Mucosa/olho: irrigar com água ou soro por 5 a 10 minutos.",
      "Comunicar o responsável técnico/responsável pelo estabelecimento imediatamente.",
      "Registrar o acidente (data, hora, descrição, cliente envolvido se houver, testemunha).",
      "Encaminhar o profissional a serviço de saúde de referência para avaliação de profilaxia, conforme orientação médica.",
      "Preservar o instrumento envolvido para descarte correto, sem reutilizar.",
    ],
    hygiene: ["Revisar se o EPI (luva, óculos quando indicado) estava em uso e reforçar o treinamento."],
    disposal: ["Material envolvido no acidente: perfurocortante ou saco branco, conforme o tipo."],
    records: ["Ficha de acidente de trabalho / comunicação interna. Atestados e encaminhamentos."],
  }),
  pop({
    key: "rouparia",
    code: "POP-07",
    title: "Higienização de toalhas, capes e rouparia",
    area: "Rouparia",
    objective: "Evitar compartilhamento de tecido sujo e garantir lavagem adequada entre clientes.",
    application: "Toalhas, capes, lençóis de maca, faixas e semelhantes do {{salao}}.",
    defaultFrequency: "Troca a cada cliente. Lavagem diária ou sempre que o cesto de sujos completar.",
    defaultProducts: "Cesto de sujos com tampa, saco plástico, sabão, hipoclorito ou sanitizante têxtil, área de secagem ou secadora.",
    steps: [
      "Usar toalha/cape limpa para cada cliente.",
      "Após o uso, colocar no cesto de sujos — nunca reutilizar no próximo cliente.",
      "Lavar em ciclo completo, separado de roupa particular.",
      "Peças com mancha de sangue: pré-lavar com água fria e sabão antes do ciclo.",
      "Secar completamente. Guardar em local limpo, fechado, separado do sujo.",
    ],
    hygiene: ["Fluxo sujo → lavagem → limpo em um só sentido. Não cruzar cestos."],
    disposal: ["Tecido irrecuperável com sujidade biológica: saco branco. Demais: lixo comum."],
    records: ["Controle de troca de toalhas por turno, quando o volume justificar."],
  }),
];

export const SERVICE_POP_TEMPLATES: PopTemplate[] = [
  pop({
    key: "servico-depilacao",
    kind: "SERVICO",
    code: "POP-S01",
    title: "Procedimento de depilação",
    area: "Depilação",
    match: ["depil", "cera", "line", "buço", "virilha"],
    objective: "Executar a depilação com biossegurança, reduzindo risco de queimadura, infecção e contaminação cruzada.",
    application: "Profissionais que realizam {{servico}} no {{salao}}.",
    defaultFrequency: "A cada sessão. Troca de espátula e proteção a cada cliente.",
    defaultProducts: "Cera com registro, espátula descartável, luva, papel, antisséptico têrmico, óleo removedor, autoclave para pinças se houver.",
    steps: [
      "Conferir anamnese (pele íntegra, alergia, uso de ácido, herpes, gestação quando aplicável).",
      "Preparar a estação com campos limpos e material estéril ou descartável à vista.",
      "Higienizar as mãos e calçar luva.",
      "Limpar a pele. Testar temperatura da cera no próprio pulso, nunca direto no cliente.",
      "Aplicar com espátula descartável. Uma espátula não volta ao pote após contato com a pele.",
      "Remover conforme a técnica (cera quente, fria, linha). Não reutilizar rolo ou aplicador entre clientes.",
      "Finalizar com produto calmante. Orientar: sol, piscina, cremes ácidos nas 24–48 h.",
      "Desprezar descartáveis e processar artigos reutilizáveis.",
    ],
    hygiene: ["Pote de cera: não dupla imersão. Tampas e aquecedor: limpar e desinfetar ao final do turno."],
    disposal: ["Cera usada e papel: lixo comum se sem sangue. Com sangue: saco branco. Espátula: comum ou RSS conforme sujidade."],
    records: ["Anamnese. Registro de lote da cera quando o fabricante indicar."],
  }),
  pop({
    key: "servico-unhas",
    kind: "SERVICO",
    code: "POP-S02",
    title: "Procedimento de manicure, pedicure e unhas",
    area: "Unhas",
    match: ["unha", "manicure", "pedicure", "esmalte", "gel", "fibra", "alongamento", "cuticula"],
    objective: "Realizar o serviço de unhas sem compartilhar artigo contaminado e com esterilização de alicates.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Pacote estéril por cliente. Descartáveis de uso único.",
    defaultProducts: "Alicate e tesoura esterilizados em pacote, palito, lixa e luva descartáveis, álcool 70%, cubas, esmaltes com registro.",
    steps: [
      "Abrir o pacote estéril na frente da cliente.",
      "Higienizar as mãos, calçar luva. Avaliar unhas e pele (micose, ferida: não proceder e orientar busca de médico).",
      "Uso de palito, lixa e luva de uso único. Alicate só do pacote daquela cliente.",
      "Não tocar o pincel do esmalte na pele lesada. Não reabastecer esmalte com restos.",
      "Ao término, artigos críticos vão para caixa suja / POP-04. Descartáveis no coletor correto.",
    ],
    hygiene: ["Bancada e apoio de mãos: álcool 70% entre clientes. Bacias de pedicure: lavar, desinfetar e secar."],
    disposal: ["Lixa, palito e disco de lixa: coletor de perfurocortante se rígido/contaminado; senão RSS branco se houver sangue."],
    records: ["Ciclo de autoclave vinculado ao pacote usado. Anamnese quando houver lesão prévia."],
  }),
  pop({
    key: "servico-cabelo",
    kind: "SERVICO",
    code: "POP-S03",
    title: "Procedimento capilar",
    area: "Cabelo",
    match: ["corte", "cabelo", "escova", "hidrata", "color", "mecha", "luzes", "progressiva", "química", "alisamento", "permanente", "botox capilar"],
    objective: "Executar serviços capilares com higiene da estação, desinfecção de pentes e tesouras e manuseio seguro de químicos.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Cape e toalha limpos por cliente. Desinfecção de pentes e tesouras ao final de cada atendimento ou quando houver contato com ferida.",
    defaultProducts: "Cape, toalha, pentes, tesoura, bacia, químicos com FISPQ/rótulo, luva para coloração e alisamento, álcool 70%.",
    steps: [
      "Proteger a cliente com cape/toalha limpos.",
      "Anamnese rápida: alergia, química recente, ferida no couro cabeludo, gestação.",
      "Para coloração/alisamento: luva, ventilação, mistura conforme fabricante. Não guardar sobra no frasco original.",
      "Tesoura e pente: se tocarem ferida, interromper e processar como semicrítico.",
      "Ao final, recolher cabelo do chão, trocar cape, desinfetar pente, escova, bico e cadeiras.",
    ],
    hygiene: ["Escovas e pentes: lavar, desinfetar e secar. Não deixar de molho de um dia para o outro."],
    disposal: ["Cabelo: saco comum. Embalagens de químico: descarte conforme rótulo. Luva com produto: comum, salvo sujidade biológica."],
    records: ["Ficha de química (data, produto, lote, reação adversa). FISPQ acessível."],
  }),
  pop({
    key: "servico-barba",
    kind: "SERVICO",
    code: "POP-S04",
    title: "Procedimento de barba e barbearia",
    area: "Barbearia",
    match: ["barba", "barbear", "navalha", "toalha quente", "pezinho"],
    objective: "Realizar barba com artigo descartável ou esterilizado, sem reutilizar lâmina.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Lâmina nova por cliente. Toalha limpa por cliente.",
    defaultProducts: "Lâmina descartável, cabo, toalha, espuma, antisséptico, luva quando houver risco de sangue, coletor amarelo.",
    steps: [
      "Preparar toalha limpa e lâmina nova, aberta na frente do cliente.",
      "Avaliar pele (foliculite, ferida, herpes: não barbear a área).",
      "Após o uso, a lâmina vai direto ao coletor de perfurocortantes — nunca reencapar com a mão.",
      "Cabo e pincel: lavar e desinfetar. Toalha para POP-07.",
    ],
    hygiene: ["Navalha retrátil: se a lâmina for reutilizável, tratar como semicrítico (POP-04). Preferir descartável."],
    disposal: ["Lâmina: coletor grupo E. Algodão com sangue: saco branco."],
    records: ["Troca do coletor de lâminas. Anamnese se houver lesão."],
  }),
  pop({
    key: "servico-estetica-facial",
    kind: "SERVICO",
    signer: "TECHNICAL",
    code: "POP-S05",
    title: "Procedimento de estética facial",
    area: "Estética",
    match: ["limpeza de pele", "peeling", "facial", "extracao", "extração", "skincare", "alta frequencia", "alta frequência"],
    objective: "Realizar procedimentos faciais com pele avaliada, material descartável ou processado e sem extração agressiva em pele contraindicada.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Campos e gazes novos por cliente. Ponteiras e spatulas processadas a cada uso.",
    defaultProducts: "Luva, gaze, algodão, antisséptico, produtos tópicos com registro, campos, autoclave para curetas se houver extração.",
    steps: [
      "Anamnese (ácido, isotretinoína, herpes, gestação, alergia, bronzeamento).",
      "Higienizar mãos, luva, proteger cabelo e maca com campo limpo.",
      "Limpeza, extração somente com pele apta e material estéril/descartável. Não reutilizar comedone extractor sem esterilizar.",
      "Máquina de alta frequência e vaporizador: higienizar ponteiras e copo conforme fabricante.",
      "Orientar fotoproteção e sinais de alerta (dor, pus, febre).",
    ],
    hygiene: ["Maca, luminária e bandeja: desinfetar entre clientes. Nunca dupla imersão de spatulas no pote."],
    disposal: ["Gaze/algodão com secreção: saco branco. Demais descartáveis: comum ou RSS conforme sujidade."],
    records: ["Ficha de anamnese estética. Lote dos ácidos/peelings."],
  }),
  pop({
    key: "servico-estetica-corporal",
    kind: "SERVICO",
    signer: "TECHNICAL",
    code: "POP-S06",
    title: "Procedimento de estética corporal e massagem",
    area: "Estética",
    match: ["massagem", "drenagem", "corporal", "modeladora", "criolipolise", "endermologia", "ventosa", "laser", "luz pulsada", "depilacao a laser", "depilação a laser"],
    objective: "Atender com lençol/campo limpo, óleo em dose individual e maca desinfetada.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Rouparia e campo por cliente. Desinfecção da maca a cada troca.",
    defaultProducts: "Lençol, campo, óleo/creme em bisnaga ou dose, luva se houver lesão, álcool 70%.",
    steps: [
      "Anamnese (trombose, febre, dermatite, gestação, cirurgia recente).",
      "Trocar lençol. Não reutilizar toalha de corpo.",
      "Dose de óleo/creme em godê — o que tocou a pele não volta ao frasco.",
      "Ao final, desinfetar maca, apoios e puxadores. Rouparia para POP-07.",
    ],
    hygiene: ["Ventosas e ponteiras: lavar, desinfetar ou esterilizar conforme contato com pele íntegra ou não."],
    disposal: ["Papel descartável de maca: comum. Com sangue: branco."],
    records: ["Anamnese corporal. Manutenção de equipamentos."],
  }),
  pop({
    key: "servico-sobrancelha",
    kind: "SERVICO",
    code: "POP-S07",
    title: "Procedimento de sobrancelha e henna",
    area: "Estética",
    match: ["sobrancelha", "henna", "brow", "design de sobrancelha"],
    objective: "Executar design e tintura com pinça processada e produto de uso individual na mistura.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Pinça esterilizada ou desinfetada de alto nível por cliente. Aplicadores descartáveis.",
    defaultProducts: "Pinça, henna/tintura com registro, pincel descartável, algodão, luva, antisséptico.",
    steps: [
      "Perguntar alergia a tintura/henna. Teste de toque quando indicado pelo fabricante.",
      "Pinça do pacote da cliente ou desinfetada. Não usar a pinça da estação “compartilhada” sem processar.",
      "Mistura de henna em godê individual. Descartar sobra.",
      "Pele lesionada ou blefarite: não proceder.",
    ],
    hygiene: ["Espelho, banco e bandeja: álcool 70% entre clientes."],
    disposal: ["Algodão com tintura: comum. Com sangue: branco. Pinça para POP-03/04."],
    records: ["Teste de toque e anamnese de alergia."],
  }),
  pop({
    key: "servico-maquiagem",
    kind: "SERVICO",
    code: "POP-S08",
    title: "Procedimento de maquiagem",
    area: "Maquiagem",
    match: ["maquiagem", "makeup", "make"],
    objective: "Evitar contaminação de estojo e pincéis entre clientes.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Pincéis lavados após cada cliente. Espátulas descartáveis para cremes.",
    defaultProducts: "Pincéis, spatulas descartáveis, álcool 70%, sabão neutro, papel, produtos com validade visível.",
    steps: [
      "Não aplicar maquiagem sobre pele com lesão ativa, conjuntivite ou herpes.",
      "Retirar produto cremoso com spatula descartável — o pincel não mergulha de volta no potinho após a pele.",
      "Lápis: apontar ou higienizar a ponta entre clientes.",
      "Ao final, lavar pincéis, secar na horizontal e guardar limpos.",
    ],
    hygiene: ["Descartar produto vencido, ressecado ou com alteração de cheiro/cor."],
    disposal: ["Spatulas e lenços: comum. Com secreção ocular: branco."],
    records: ["Controle de validade da maleta. Lavagem de pincéis."],
  }),
  pop({
    key: "servico-cilios",
    kind: "SERVICO",
    code: "POP-S09",
    title: "Procedimento de cílios",
    area: "Cílios",
    match: ["cilio", "cílio", "lash", "extensao de cilios", "extensão de cílios", "alongamento de cilios"],
    objective: "Aplicar, alongar ou permanente de cílios com higiene da estação, cola de uso controlado e sem reutilizar descartável.",
    application: "Profissionais de {{servico}} no {{salao}}.",
    defaultFrequency: "Descartáveis e pad por cliente. Pinça processada a cada atendimento.",
    defaultProducts: "Fita, pad, microbrush, cola para cílios com registro, pinça, álcool 70%, luva quando indicado.",
    steps: [
      "Perguntar alergia a cola/resina, blefarite, cirurgia ocular recente ou lente de contato.",
      "Higienizar as mãos. Proteger a pálpebra inferior com pad novo.",
      "Pinça processada (POP-03/04). Microbrush e fita de uso único.",
      "Cola em godê individual — a sobra não volta ao frasco.",
      "Não aplicar sobre inflamação, ferida ou secreção ocular.",
      "Orientar: não molhar no prazo do fabricante, não puxar fios, sinais de alerta (ardência, edema).",
    ],
    hygiene: ["Maca, luminária e apoio: álcool 70% entre clientes. Não soprar a cola na direção do olho."],
    disposal: ["Pads, fita e microbrush: comum. Com secreção ocular: saco branco. Pinça para processamento."],
    records: ["Anamnese de alergia. Lote da cola quando o fabricante indicar."],
  }),
  pop({
    key: "servico-micropigmentacao",
    kind: "SERVICO",
    signer: "TECHNICAL",
    code: "POP-S10",
    title: "Procedimento de micropigmentação",
    area: "Estética",
    match: ["micropigment", "nanopigment", "dermopigment"],
    objective: "Executar micropigmentação com biossegurança, material estéril/descartável e responsável técnico habilitado.",
    application: "Profissionais habilitados de {{servico}} no {{salao}}.",
    defaultFrequency: "Kit estéril/descartável por cliente. Barreira no equipamento a cada atendimento.",
    defaultProducts: "Agulha/cartucho estéril de uso único, tinta com registro, luva, campos, antisséptico, filme barreira, coletor de perfurocortante.",
    steps: [
      "Anamnese completa (coagulopatia, gestação, queloide, alergia, medicamentos, herpes).",
      "Termo de consentimento. Fotos se o protocolo do {{salao}} prever.",
      "Higienizar mãos, luva, campo. Barreira no derma pen/máquina.",
      "Abrir agulha/cartucho na frente da cliente. Uso único — não reencapar.",
      "Tinta em godê individual. Descartar sobra.",
      "Ao término, agulha no coletor grupo E. Superfícies desinfetadas. Orientar cuidados e sinais de infecção.",
    ],
    hygiene: ["Proibido reutilizar cartucho, agulha ou biqueira. Bancada: desinfecção entre clientes."],
    disposal: ["Agulha/cartucho: coletor amarelo. Gaze com sangue: saco branco."],
    records: ["Anamnese, termo, lote da tinta e da agulha, identificação do responsável técnico."],
  }),
];

export const SERVICE_POP_FALLBACK: PopTemplate = pop({
  key: "servico-geral",
  kind: "SERVICO",
  code: "POP-S99",
  title: "Procedimento operacional do serviço",
  area: "Serviço",
  objective: "Padronizar a execução de {{servico}} com biossegurança e rastreabilidade no {{salao}}.",
  application: "Profissionais que realizam {{servico}}.",
  defaultFrequency: "A cada atendimento.",
  defaultProducts: "Luva quando houver risco de contato com sangue ou mucosa, campos limpos, álcool 70%, artigos processados conforme criticidade.",
  steps: [
    "Confirmar anamnese e ausência de contraindicação aparente.",
    "Preparar a estação com material limpo/estéril e descartável necessário.",
    "Higienizar as mãos e usar EPI indicado.",
    "Executar {{servico}} conforme técnica do serviço, sem reutilizar descartável.",
    "Orientar cuidados posteriores.",
    "Processar artigos e limpar a estação (POP-02, POP-03 e POP-04 quando couber).",
  ],
  hygiene: ["Superfícies de contato desinfetadas entre clientes."],
  disposal: ["Seguir POP-05 conforme o tipo de resíduo gerado."],
  records: ["Anamnese quando o serviço envolver pele, química ou risco alérgico."],
});

export function popByKey(key: string) {
  return POP_CATALOG.find((item) => item.key === key) ?? SERVICE_POP_TEMPLATES.find((item) => item.key === key) ?? (key === SERVICE_POP_FALLBACK.key ? SERVICE_POP_FALLBACK : null);
}

export function normalizePopNeedle(value: string) {
  return slugify(value).replace(/-/g, " ");
}

export function matchServicePop(serviceName: string) {
  const haystack = normalizePopNeedle(serviceName);
  let best: PopTemplate | null = null;
  let bestLen = 0;
  for (const template of SERVICE_POP_TEMPLATES) {
    for (const keyword of template.match ?? []) {
      const needle = normalizePopNeedle(keyword);
      if (!needle || !haystack.includes(needle) || needle.length < bestLen) continue;
      best = template;
      bestLen = needle.length;
    }
  }
  return best ?? SERVICE_POP_FALLBACK;
}

export function popPublicPath(tenantSlug: string, popSlug: string) {
  return `/pop/${tenantSlug}/${popSlug}`;
}

export function popPublicUrl(publicAppUrl: string, tenantSlug: string, popSlug: string) {
  const path = popPublicPath(tenantSlug, popSlug);
  const base = (publicAppUrl || process.env.APP_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function absolutePopUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.APP_URL || "https://beauty.megaflood.cloud").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function uniquePopSlug(base: string, used: Set<string>) {
  const root = slugify(base) || "pop";
  let slug = root;
  let index = 2;
  while (used.has(slug)) {
    slug = `${root}-${index}`.slice(0, 56);
    index += 1;
  }
  used.add(slug);
  return slug;
}
