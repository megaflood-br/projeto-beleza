import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMinutes } from "date-fns";
import { calendarDate, calendarMonth, monthStartEnd, zonedDateTime } from "../src/lib/dates";
import { buildAccessKey, taxCentsForKind } from "../src/lib/fiscal";
import { comandaTotal } from "../src/lib/comandas";
import { ensureFinanceCatalog } from "../src/lib/finance-catalog";
import { ensureAnamnesisForms, serializeAnswers } from "../src/lib/anamnesis";
import { postLedgerEntry } from "../src/lib/ledger";
import { ensurePlatformPlans } from "../src/lib/plans";

const prisma = new PrismaClient();

function at(day: Date, hour: number, minute = 0) {
  return zonedDateTime(calendarDate(day), `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

async function main() {
  await prisma.promotionItem.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.fiscalInvoice.deleteMany();
  await prisma.professionalGoal.deleteMany();
  await prisma.cashbackMovement.deleteMany();
  await prisma.platformPlan.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportCall.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.supportPresence.deleteMany();
  await prisma.anamnesis.deleteMany();
  await prisma.anamnesisForm.deleteMany();
  await prisma.comandaItem.deleteMany();
  await prisma.comanda.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.clientPackage.deleteMany();
  await prisma.package.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.paymentMethodConfig.deleteMany();
  await prisma.financeCategory.deleteMany();
  await prisma.financeAccount.deleteMany();
  await prisma.appointmentItem.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.serviceProduct.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.productRequest.deleteMany();
  await prisma.productLot.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.client.deleteMany();
  await prisma.tenant.deleteMany();

  await ensurePlatformPlans();

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);
  const today = zonedDateTime(calendarDate(), "12:00");

  const hq = await prisma.tenant.create({
    data: {
      name: "MegaBeauty Plataforma",
      slug: "megabeauty",
      email: "nathan.k@example.net",
      city: "São Paulo, SP",
      plan: "premium",
      status: "ACTIVE",
      isPlatform: true,
      kind: "PLATFORM",
    },
  });
  const admin = await prisma.user.create({
    data: {
      tenantId: hq.id,
      email: "nathan.k@example.net",
      passwordHash: adminHash,
      name: "Admin MegaBeauty",
      role: "SUPER_ADMIN",
    },
  });

  const aurora = await prisma.tenant.create({
    data: {
      name: "Studio Aurora",
      slug: "studio-aurora",
      tradeName: "Studio Aurora Beleza & Estética",
      document: "12.345.678/0001-90",
      phone: "11987654321",
      email: "iris.p@example.org",
      address: "Rua Harmonia, 240",
      city: "São Paulo, SP",
      plan: "profissional",
      status: "ACTIVE",
      accentColor: "#2563EB",
      openTime: "08:00",
      closeTime: "20:00",
      fiscalEnabled: true,
      fiscalCnpj: "12345678000195",
      fiscalIm: "123456",
      fiscalUf: "SP",
      fiscalIbge: "3550308",
      fiscalIssPct: 5,
      fiscalServiceCode: "6.01",
      fiscalSeries: "1",
      fiscalNextNumber: 3,
      fiscalProvider: "contora",
      fiscalEnvironment: "homolog",
      fiscalStreet: "Rua Harmonia",
      fiscalNumber: "240",
      fiscalDistrict: "Vila Madalena",
      fiscalZip: "05435000",
      cashbackEnabled: true,
      cashbackEarnPct: 5,
      cashbackUseItemPct: true,
      cashbackOnServices: true,
      cashbackOnProducts: true,
      cashbackMaxRedeemPct: 50,
      cashbackCentsPerPoint: 100,
    },
  });
  await ensureFinanceCatalog(aurora.id);
  await ensureAnamnesisForms(aurora.id);

  const luna = await prisma.tenant.create({
    data: {
      name: "Espaço Luna",
      slug: "espaco-luna",
      phone: "11955550000",
      email: "walt.e@example.net",
      city: "Campinas, SP",
      plan: "essencial",
      status: "TRIAL",
      trialEndsAt: addDays(today, 10),
      notes: "Conta de demonstração em trial.",
    },
  });
  const lunaOwner = await prisma.user.create({
    data: {
      tenantId: luna.id,
      email: "walt.e@example.net",
      passwordHash,
      name: "Luna Ribeiro",
      role: "OWNER",
    },
  });
  await ensureFinanceCatalog(luna.id);
  await ensureAnamnesisForms(luna.id);

  const camila = await prisma.professional.create({
    data: {
      tenantId: aurora.id,
      name: "Camila Ferreira",
      nickname: "Cami",
      color: "#2563EB",
      specialty: "Cabelo",
      commissionPct: 45,
      phone: "11970001111",
      workStart: "09:00",
      workEnd: "19:00",
    },
  });
  const rafaela = await prisma.professional.create({
    data: {
      tenantId: aurora.id,
      name: "Rafaela Nunes",
      nickname: "Rafa",
      color: "#7C3AED",
      specialty: "Estética",
      commissionPct: 40,
      phone: "11970002222",
      workStart: "09:00",
      workEnd: "18:00",
    },
  });
  const bruno = await prisma.professional.create({
    data: {
      tenantId: aurora.id,
      name: "Bruno Almeida",
      nickname: "Bruno",
      color: "#0D9488",
      specialty: "Barbearia",
      commissionPct: 50,
      phone: "11970003333",
      workStart: "10:00",
      workEnd: "20:00",
    },
  });
  const leticia = await prisma.professional.create({
    data: {
      tenantId: aurora.id,
      name: "Letícia Prado",
      nickname: "Lê",
      color: "#6366F1",
      specialty: "Unhas",
      commissionPct: 40,
      phone: "11970004444",
      workStart: "09:00",
      workEnd: "18:00",
    },
  });

  const ana = await prisma.user.create({
    data: {
      tenantId: aurora.id,
      email: "iris.p@example.org",
      passwordHash,
      name: "Ana Souza",
      role: "OWNER",
    },
  });
  await prisma.user.create({
    data: {
      tenantId: aurora.id,
      email: "xavier.y@example.org",
      passwordHash,
      name: "Marina Costa",
      role: "RECEPTIONIST",
    },
  });
  await prisma.user.create({
    data: {
      tenantId: aurora.id,
      email: "grace.l@example.com",
      passwordHash,
      name: "Camila Ferreira",
      role: "PROFESSIONAL",
      professionalId: camila.id,
    },
  });

  const supply = await prisma.tenant.create({
    data: {
      name: "Beauty Supply SP",
      slug: "beauty-supply-sp",
      phone: "1133334444",
      email: "oscar.d@example.net",
      city: "São Paulo, SP",
      address: "Rua dos Fornecedores, 120",
      plan: "fornecedor",
      status: "ACTIVE",
      kind: "SUPPLIER",
      deliveryMinCents: 15000,
      deliveryFeeCents: 1500,
      supplierPayMethods: "PIX,CASH,TRANSFER",
      servedCities: JSON.stringify(["Atibaia/SP", "Campinas/SP", "São Paulo/SP"]),
    },
  });
  const supplyUser = await prisma.user.create({
    data: {
      tenantId: supply.id,
      email: "oscar.d@example.net",
      passwordHash,
      name: "Paulo Distribuidor",
      role: "SUPPLIER",
    },
  });
  const mask = await prisma.supplierProduct.create({
    data: {
      tenantId: supply.id,
      name: "Máscara hidratação 500ml",
      brand: "Lumina",
      sku: "LUM-500",
      category: "Tratamento",
      unit: "un",
      priceCents: 8900,
      minQty: 1,
      stock: 40,
      description: "Máscara profissional para cabelos danificados.",
    },
  });
  await prisma.supplierProduct.createMany({
    data: [
      {
        tenantId: supply.id,
        name: "Ox 20 volumes 900ml",
        brand: "Lumina",
        sku: "LUM-OX20",
        category: "Coloração",
        unit: "un",
        priceCents: 3200,
        minQty: 3,
        stock: 80,
      },
      {
        tenantId: supply.id,
        name: "Luva de procedimento (100 un)",
        brand: "MedCare",
        sku: "MC-LUV",
        category: "Descartáveis",
        unit: "un",
        priceCents: 2490,
        minQty: 1,
        stock: null,
      },
    ],
  });
  await prisma.supplierOrder.create({
    data: {
      salonTenantId: aurora.id,
      supplierTenantId: supply.id,
      createdById: ana.id,
      status: "SUBMITTED",
      notes: "Reposição da semana.",
      totalCents: 8900,
      items: {
        create: {
          productId: mask.id,
          name: mask.name,
          brand: mask.brand,
          sku: mask.sku,
          unit: mask.unit,
          quantity: 1,
          unitCents: mask.priceCents,
          lineCents: mask.priceCents,
        },
      },
    },
  });
  void supplyUser;

  const cats = await prisma.serviceCategory.createManyAndReturn({
    data: [
      { tenantId: aurora.id, name: "Cabelo", sortOrder: 1 },
      { tenantId: aurora.id, name: "Estética", sortOrder: 2 },
      { tenantId: aurora.id, name: "Barba", sortOrder: 3 },
      { tenantId: aurora.id, name: "Unhas", sortOrder: 4 },
    ],
  });

  const [catCabelo, catEstetica, catBarba, catUnhas] = cats;

  const corte = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catCabelo.id,
      name: "Corte feminino",
      durationMin: 60,
      priceCents: 12000,
      color: "#2563EB",
      commissionPct: 45,
    },
  });
  const coloracao = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catCabelo.id,
      name: "Coloração",
      durationMin: 150,
      priceCents: 38000,
      color: "#1D4ED8",
    },
  });
  const hidratacao = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catCabelo.id,
      name: "Hidratação",
      durationMin: 45,
      priceCents: 9000,
      color: "#7C3AED",
    },
  });
  const limpeza = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catEstetica.id,
      name: "Limpeza de pele",
      durationMin: 75,
      priceCents: 18000,
      color: "#7C3AED",
    },
  });
  const design = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catEstetica.id,
      name: "Design de sobrancelha",
      durationMin: 30,
      priceCents: 5500,
      color: "#F59E0B",
    },
  });
  const barba = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catBarba.id,
      name: "Barba completa",
      durationMin: 40,
      priceCents: 7000,
      color: "#0D9488",
      commissionPct: 50,
    },
  });
  const corteMasc = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catBarba.id,
      name: "Corte masculino",
      durationMin: 45,
      priceCents: 8000,
      color: "#1D7A70",
    },
  });
  const esmalteria = await prisma.service.create({
    data: {
      tenantId: aurora.id,
      categoryId: catUnhas.id,
      name: "Esmaltação em gel",
      durationMin: 60,
      priceCents: 9500,
      color: "#6366F1",
    },
  });

  const servicesByPro = [
    [camila.id, [corte.id, coloracao.id, hidratacao.id]],
    [rafaela.id, [limpeza.id, design.id]],
    [bruno.id, [barba.id, corteMasc.id]],
    [leticia.id, [esmalteria.id]],
  ] as const;

  for (const [professionalId, serviceIds] of servicesByPro) {
    await prisma.professionalService.createMany({
      data: serviceIds.map((serviceId) => ({ professionalId, serviceId })),
    });
  }

  const productCats = await prisma.productCategory.createManyAndReturn({
    data: [
      { tenantId: aurora.id, name: "Coloração", sortOrder: 1 },
      { tenantId: aurora.id, name: "Tratamento", sortOrder: 2 },
      { tenantId: aurora.id, name: "Cabelos", sortOrder: 3 },
      { tenantId: aurora.id, name: "Unhas", sortOrder: 4 },
    ],
  });
  const [catColor, catTrat, catCabelos, catUnhasProd] = productCats;

  const tinta = await prisma.product.create({
    data: {
      tenantId: aurora.id,
      categoryId: catColor.id,
      name: "Tinta profissional 60ml",
      sku: "TIN-60",
      barcode: "7891000000011",
      brand: "Wella",
      unit: "un",
      costCents: 2800,
      saleCents: 0,
      stock: 8,
      minStock: 4,
    },
  });
  const mascara = await prisma.product.create({
    data: {
      tenantId: aurora.id,
      categoryId: catTrat.id,
      name: "Máscara hidratação 500ml",
      sku: "HID-500",
      barcode: "7891000000028",
      brand: "L'Oréal",
      unit: "un",
      costCents: 4200,
      saleCents: 8900,
      stock: 3,
      minStock: 4,
    },
  });
  const esmalte = await prisma.product.create({
    data: {
      tenantId: aurora.id,
      categoryId: catUnhasProd.id,
      name: "Esmalte gel rose",
      sku: "GEL-ROSE",
      brand: "Risqué",
      unit: "un",
      costCents: 1800,
      saleCents: 4500,
      stock: 12,
      minStock: 5,
    },
  });
  await prisma.product.create({
    data: {
      tenantId: aurora.id,
      categoryId: catCabelos.id,
      name: "Shampoo profissional 1L",
      sku: "SHA-1L",
      brand: "L'Oréal",
      unit: "un",
      costCents: 3500,
      saleCents: 7900,
      stock: 15,
      minStock: 5,
    },
  });

  await prisma.productLot.createMany({
    data: [
      {
        tenantId: aurora.id,
        productId: tinta.id,
        code: "WEL-2608",
        quantity: 8,
        expiresAt: addDays(today, 180),
      },
      {
        tenantId: aurora.id,
        productId: mascara.id,
        code: "LOR-112",
        quantity: 3,
        expiresAt: addDays(today, 18),
      },
    ],
  });

  await prisma.productRequest.create({
    data: {
      tenantId: aurora.id,
      productId: mascara.id,
      professionalId: camila.id,
      quantity: 1,
      notes: "Uso na hidratação da tarde",
    },
  });

  await prisma.serviceProduct.createMany({
    data: [
      { serviceId: coloracao.id, productId: tinta.id, quantity: 1 },
      { serviceId: hidratacao.id, productId: mascara.id, quantity: 0.2 },
      { serviceId: esmalteria.id, productId: esmalte.id, quantity: 0.15 },
    ],
  });

  const clientsData = [
    { name: "Juliana Martins", phone: "11991110001", email: "juliana@email.com", tags: "vip,coloracao", instagram: "@julianam" },
    { name: "Pedro Henrique", phone: "11991110002", email: "pedro@email.com", tags: "barba", instagram: "@pedroh" },
    { name: "Fernanda Lima", phone: "11991110003", email: "fernanda@email.com", tags: "recorrente", instagram: "@flima" },
    { name: "Carla Mendes", phone: "11991110004", tags: "estetica" },
    { name: "Thiago Rocha", phone: "11991110005", tags: "novo" },
    { name: "Beatriz Gomes", phone: "11991110006", tags: "unhas,vip" },
    { name: "Amanda Dias", phone: "11991110007", tags: "cabelo" },
    { name: "Lucas Oliveira", phone: "11991110008", tags: "barba" },
    { name: "Patrícia Souza", phone: "11991110009", tags: "inativa", active: false },
    { name: "Renata Alves", phone: "11991110010", tags: "pacote" },
  ];

  const clients = [];
  for (const item of clientsData) {
    clients.push(
      await prisma.client.create({
        data: { tenantId: aurora.id, source: "indicacao", ...item },
      }),
    );
  }

  const [juliana, pedro, fernanda, carla, thiago, beatriz, amanda, lucas, patricia, renata] = clients;
  await prisma.client.update({
    where: { id: juliana.id },
    data: { cashbackCents: 4500 },
  });
  await prisma.cashbackMovement.create({
    data: {
      tenantId: aurora.id,
      clientId: juliana.id,
      type: "MANUAL",
      amountCents: 4500,
      points: 45,
      reason: "Saldo inicial de demonstração",
      createdByName: "Admin MegaBeauty",
    },
  });

  const forms = await prisma.anamnesisForm.findMany({ where: { tenantId: aurora.id } });
  const formBySlug = Object.fromEntries(forms.map((form) => [form.slug, form]));
  async function fillAnamnesis(opts: {
    clientId: string;
    slug: string;
    professionalId: string;
    status: "DRAFT" | "COMPLETED";
    answers: Record<string, { value: string; detail?: string }>;
    notes?: string;
    signedName?: string;
    daysAgo?: number;
  }) {
    const form = formBySlug[opts.slug];
    if (!form) return;
    await prisma.anamnesis.create({
      data: {
        tenantId: aurora.id,
        clientId: opts.clientId,
        formId: form.id,
        professionalId: opts.professionalId,
        status: opts.status,
        answers: serializeAnswers(opts.answers),
        notes: opts.notes,
        signedName: opts.signedName,
        signedAt: opts.status === "COMPLETED" ? addDays(today, -(opts.daysAgo ?? 3)) : null,
        occurredAt: addDays(today, -(opts.daysAgo ?? 3)),
      },
    });
  }

  await fillAnamnesis({
    clientId: juliana.id,
    slug: "coloracao",
    professionalId: camila.id,
    status: "COMPLETED",
    daysAgo: 12,
    signedName: "Juliana Martins",
    notes: "Teste de mecha ok. Seguir com coloração tom 7.1.",
    answers: {
      quimica_recente: { value: "no" },
      couro: { value: "no" },
      ppd: { value: "yes", detail: "Relatou coceira leve com henna há 2 anos" },
      teste_mecha: { value: "yes" },
      queda: { value: "no" },
      observacoes: { value: "Cabelo sensibilizado nas pontas." },
    },
  });
  await fillAnamnesis({
    clientId: carla.id,
    slug: "estetica",
    professionalId: rafaela.id,
    status: "COMPLETED",
    daysAgo: 5,
    signedName: "Carla Mendes",
    answers: {
      acidos: { value: "yes", detail: "Ácido glicólico 2x por semana" },
      procedimento: { value: "no" },
      pele: { value: "yes", detail: "Melasma na região malar" },
      sol: { value: "no" },
      protetor: { value: "yes" },
      observacoes: { value: "Evitar peeling médio." },
    },
  });
  await fillAnamnesis({
    clientId: beatriz.id,
    slug: "unhas",
    professionalId: leticia.id,
    status: "DRAFT",
    daysAgo: 1,
    answers: {
      micose: { value: "no" },
      alergia_gel: { value: "no" },
      circulacao: { value: "no" },
    },
  });
  await fillAnamnesis({
    clientId: juliana.id,
    slug: "geral",
    professionalId: camila.id,
    status: "COMPLETED",
    daysAgo: 40,
    signedName: "Juliana Martins",
    answers: {
      alergia: { value: "yes", detail: "Látex" },
      medicamentos: { value: "no" },
      gestante: { value: "no" },
      cronica: { value: "no" },
      herpes: { value: "no" },
      queloide: { value: "no" },
      reacao: { value: "no" },
    },
  });

  async function book(opts: {
    professionalId: string;
    clientId: string;
    serviceId: string;
    start: Date;
    status: string;
    source?: string;
    notes?: string;
  }) {
    const service = await prisma.service.findUniqueOrThrow({ where: { id: opts.serviceId } });
    const end = addMinutes(opts.start, service.durationMin);
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: aurora.id,
        professionalId: opts.professionalId,
        clientId: opts.clientId,
        startAt: opts.start,
        endAt: end,
        status: opts.status,
        source: opts.source ?? "balcao",
        notes: opts.notes,
        items: {
          create: {
            serviceId: service.id,
            priceCents: service.priceCents,
            durationMin: service.durationMin,
          },
        },
      },
    });

    if (opts.status === "COMPLETED") {
      const pct = service.commissionPct ?? (await prisma.professional.findUniqueOrThrow({ where: { id: opts.professionalId } })).commissionPct;
      await prisma.commission.create({
        data: {
          tenantId: aurora.id,
          professionalId: opts.professionalId,
          appointmentId: appointment.id,
          amountCents: Math.round((service.priceCents * pct) / 100),
          percent: pct,
          status: "PENDING",
        },
      });
      await postLedgerEntry({
        tenantId: aurora.id,
        type: "INCOME",
        category: "servico",
        amountCents: service.priceCents,
        methodCode: "PIX",
        description: service.name,
        appointmentId: appointment.id,
        occurredAt: opts.start,
      });
    }
    return appointment;
  }

  await book({
    professionalId: camila.id,
    clientId: juliana.id,
    serviceId: coloracao.id,
    start: at(today, 9, 0),
    status: "CONFIRMED",
    source: "online",
  });
  await book({
    professionalId: camila.id,
    clientId: amanda.id,
    serviceId: corte.id,
    start: at(today, 12, 0),
    status: "PENDING",
  });
  await book({
    professionalId: camila.id,
    clientId: fernanda.id,
    serviceId: hidratacao.id,
    start: at(today, 14, 0),
    status: "CONFIRMED",
  });
  const emAtendimento = await book({
    professionalId: rafaela.id,
    clientId: carla.id,
    serviceId: limpeza.id,
    start: at(today, 10, 0),
    status: "IN_PROGRESS",
  });
  await book({
    professionalId: rafaela.id,
    clientId: patricia.id,
    serviceId: design.id,
    start: at(today, 13, 30),
    status: "CONFIRMED",
  });
  await book({
    professionalId: bruno.id,
    clientId: pedro.id,
    serviceId: barba.id,
    start: at(today, 11, 0),
    status: "CONFIRMED",
    source: "whatsapp",
  });
  await book({
    professionalId: bruno.id,
    clientId: lucas.id,
    serviceId: corteMasc.id,
    start: at(today, 15, 0),
    status: "PENDING",
  });
  await book({
    professionalId: leticia.id,
    clientId: beatriz.id,
    serviceId: esmalteria.id,
    start: at(today, 9, 30),
    status: "CONFIRMED",
  });
  await book({
    professionalId: leticia.id,
    clientId: renata.id,
    serviceId: esmalteria.id,
    start: at(today, 11, 0),
    status: "COMPLETED",
  });

  await book({
    professionalId: camila.id,
    clientId: juliana.id,
    serviceId: corte.id,
    start: at(addDays(today, -1), 11, 0),
    status: "COMPLETED",
  });
  await book({
    professionalId: bruno.id,
    clientId: thiago.id,
    serviceId: corteMasc.id,
    start: at(addDays(today, -1), 16, 0),
    status: "NO_SHOW",
  });
  await book({
    professionalId: rafaela.id,
    clientId: fernanda.id,
    serviceId: limpeza.id,
    start: at(addDays(today, 1), 10, 0),
    status: "PENDING",
    source: "online",
  });

  const roster = [
    { pro: camila, client: juliana, service: corte },
    { pro: bruno, client: pedro, service: barba },
    { pro: rafaela, client: fernanda, service: limpeza },
    { pro: leticia, client: beatriz, service: esmalteria },
    { pro: camila, client: amanda, service: hidratacao },
    { pro: bruno, client: lucas, service: corteMasc },
  ];
  const pastStatuses = ["COMPLETED", "COMPLETED", "CONFIRMED", "CANCELLED", "PENDING", "COMPLETED"];
  let ticket = 2;
  for (let d = 2; d <= 28; d++) {
    const day = addDays(today, -d);
    const count = 2 + (d % 3);
    for (let i = 0; i < count; i++) {
      const slot = roster[(d + i) % roster.length];
      const status = pastStatuses[(d + i) % pastStatuses.length];
      const appointment = await book({
        professionalId: slot.pro.id,
        clientId: slot.client.id,
        serviceId: slot.service.id,
        start: at(day, 9 + i, (i * 10) % 60),
        status,
      });
      if (status !== "COMPLETED") continue;
      const service = await prisma.service.findUniqueOrThrow({ where: { id: slot.service.id } });
      await prisma.comanda.create({
        data: {
          tenantId: aurora.id,
          number: ticket,
          clientId: slot.client.id,
          appointmentId: appointment.id,
          professionalId: slot.pro.id,
          status: "CLOSED",
          paymentMethod: i % 2 === 0 ? "PIX" : "CASH",
          occurredAt: at(day, 18, 0),
          closedAt: at(day, 18, 0),
          items: {
            create: {
              type: "SERVICE",
              serviceId: service.id,
              professionalId: slot.pro.id,
              description: service.name,
              quantity: 1,
              priceCents: service.priceCents,
              durationMin: service.durationMin,
            },
          },
        },
      });
      ticket += 1;
    }
  }

  const pack = await prisma.package.create({
    data: {
      tenantId: aurora.id,
      name: "Combo hidratação (4 sessões)",
      priceCents: 30000,
      sessions: 4,
      serviceId: hidratacao.id,
    },
  });
  await prisma.clientPackage.create({
    data: {
      tenantId: aurora.id,
      clientId: renata.id,
      packageId: pack.id,
      remaining: 3,
    },
  });

  await prisma.comanda.create({
    data: {
      tenantId: aurora.id,
      number: 1,
      clientId: carla.id,
      appointmentId: emAtendimento.id,
      professionalId: rafaela.id,
      status: "OPEN",
      items: {
        create: {
          type: "SERVICE",
          serviceId: limpeza.id,
          professionalId: rafaela.id,
          description: "Limpeza de pele",
          quantity: 1,
          priceCents: 18000,
          durationMin: 75,
        },
      },
    },
  });

  await postLedgerEntry({
    tenantId: aurora.id,
    type: "EXPENSE",
    category: "aluguel",
    amountCents: 450000,
    methodCode: "TRANSFER",
    organizational: true,
    description: "Aluguel do ponto",
    occurredAt: at(today, 8, 0),
  });
  await postLedgerEntry({
    tenantId: aurora.id,
    type: "EXPENSE",
    category: "fornecedor",
    amountCents: 62000,
    methodCode: "PIX",
    supplier: "Beauty Supply SP",
    description: "Reposição de tinta e máscaras",
    occurredAt: at(addDays(today, -2), 14, 0),
  });
  await postLedgerEntry({
    tenantId: aurora.id,
    type: "EXPENSE",
    category: "comissao",
    amountCents: 16200,
    methodCode: "PIX",
    professionalId: camila.id,
    description: "Pagamento de comissão para Camila Ferreira",
    occurredAt: at(addDays(today, -1), 18, 0),
  });
  await postLedgerEntry({
    tenantId: aurora.id,
    type: "INCOME",
    category: "produto",
    amountCents: 8900,
    methodCode: "PIX",
    description: "Venda máscara hidratação",
    occurredAt: at(today, 13, 0),
  });

  const convJuliana = await prisma.conversation.create({
    data: {
      tenantId: aurora.id,
      clientId: juliana.id,
      phone: juliana.phone,
      lastMessageAt: at(today, 8, 40),
      unread: 1,
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: convJuliana.id,
        direction: "OUT",
        body: "Oi Ju! Confirmando sua coloração hoje às 09:00 com a Camila 💛",
        createdAt: at(today, 8, 10),
      },
      {
        conversationId: convJuliana.id,
        direction: "IN",
        body: "Confirmado! Chego um pouco antes.",
        createdAt: at(today, 8, 40),
      },
    ],
  });

  const convPedro = await prisma.conversation.create({
    data: {
      tenantId: aurora.id,
      clientId: pedro.id,
      phone: pedro.phone,
      lastMessageAt: at(today, 9, 5),
      unread: 0,
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: convPedro.id,
        direction: "IN",
        body: "Tem horário de barba hoje de manhã?",
        createdAt: at(today, 8, 50),
      },
      {
        conversationId: convPedro.id,
        direction: "OUT",
        body: "Tenho 11:00 com o Bruno. Posso deixar reservado?",
        createdAt: at(today, 9, 5),
      },
    ],
  });

  await prisma.automation.createMany({
    data: [
      {
        tenantId: aurora.id,
        name: "Confirmação de agendamento",
        trigger: "APPOINTMENT_CREATED",
        template:
          "Oi {{nome}}! Seu horário no {{salao}} está marcado para {{data}} às {{hora}} com {{profissional}}. Responda SIM para confirmar.",
      },
      {
        tenantId: aurora.id,
        name: "Lembrete 24h",
        trigger: "REMINDER",
        template: "Oi {{nome}}, lembrando do seu horário amanhã às {{hora}} no {{salao}}. Te esperamos!",
      },
      {
        tenantId: aurora.id,
        name: "Clientes inativos 30 dias",
        trigger: "INACTIVE",
        template: "Sentimos sua falta, {{nome}}! Que tal um horário esta semana? Temos 10% na hidratação.",
      },
    ],
  });

  const norte = await prisma.tenant.create({
    data: {
      name: "Barbearia Norte",
      slug: "barbearia-norte",
      city: "Campinas, SP",
      plan: "essencial",
    },
  });
  await ensureFinanceCatalog(norte.id);
  await prisma.user.create({
    data: {
      tenantId: norte.id,
      email: "alice.j@example.com",
      passwordHash,
      name: "João Norte",
      role: "OWNER",
    },
  });
  await prisma.professional.create({
    data: {
      tenantId: norte.id,
      name: "João Norte",
      color: "#1D3557",
      specialty: "Barba",
    },
  });

  const auroraTicket = await prisma.supportTicket.create({
    data: {
      tenantId: aurora.id,
      number: 1,
      subject: "Dúvida sobre comissões da semana",
      category: "financeiro",
      priority: "HIGH",
      status: "OPEN",
      createdById: ana.id,
      lastMessageAt: addMinutes(today, -40),
      unreadAdmin: 1,
    },
  });
  await prisma.supportMessage.createMany({
    data: [
      {
        ticketId: auroraTicket.id,
        authorId: ana.id,
        side: "SALON",
        body: "As comissões da Camila ficaram diferentes do que combinamos. Podem conferir?",
        createdAt: addMinutes(today, -40),
      },
    ],
  });

  const lunaTicket = await prisma.supportTicket.create({
    data: {
      tenantId: luna.id,
      number: 1,
      subject: "Como conectar o WhatsApp?",
      category: "onboarding",
      priority: "NORMAL",
      status: "PENDING",
      createdById: lunaOwner.id,
      assignedToId: admin.id,
      lastMessageAt: addMinutes(today, -120),
      unreadSalon: 1,
    },
  });
  await prisma.supportMessage.createMany({
    data: [
      {
        ticketId: lunaTicket.id,
        authorId: lunaOwner.id,
        side: "SALON",
        body: "Estou no trial e não sei por onde começar a Evolution API.",
        createdAt: addMinutes(today, -150),
      },
      {
        ticketId: lunaTicket.id,
        authorId: admin.id,
        side: "PLATFORM",
        body: "Luna, entre em Configurações > WhatsApp e cole a URL, a API key e o nome da instância. Qualquer coisa me chama ao vivo.",
        createdAt: addMinutes(today, -120),
      },
    ],
  });

  const resolved = await prisma.supportTicket.create({
    data: {
      tenantId: aurora.id,
      number: 2,
      subject: "Ajuste no horário de abertura",
      category: "ajuda",
      priority: "LOW",
      status: "RESOLVED",
      createdById: ana.id,
      assignedToId: admin.id,
      lastMessageAt: addMinutes(today, -400),
    },
  });
  await prisma.supportMessage.createMany({
    data: [
      {
        ticketId: resolved.id,
        authorId: ana.id,
        side: "SALON",
        body: "Conseguimos mudar o horário de abertura para 8h?",
        createdAt: addMinutes(today, -420),
      },
      {
        ticketId: resolved.id,
        authorId: admin.id,
        side: "PLATFORM",
        body: "Sim — em Configurações, campo de abertura. Já deixei o caminho.",
        createdAt: addMinutes(today, -400),
      },
    ],
  });

  const month = monthStartEnd(calendarMonth(today));
  await prisma.professionalGoal.createMany({
    data: [
      { tenantId: aurora.id, professionalId: camila.id, metric: "REVENUE", targetValue: 200000, startDate: month.from, endDate: month.to, notes: "Coloração e hidratação" },
      { tenantId: aurora.id, professionalId: camila.id, metric: "SERVICES", targetValue: 14, startDate: month.from, endDate: month.to },
      { tenantId: aurora.id, professionalId: rafaela.id, metric: "REVENUE", targetValue: 180000, startDate: month.from, endDate: month.to },
      { tenantId: aurora.id, professionalId: bruno.id, metric: "REVENUE", targetValue: 200000, startDate: month.from, endDate: month.to, notes: "Barba e corte masculino" },
      { tenantId: aurora.id, professionalId: leticia.id, metric: "REVENUE", targetValue: 150000, startDate: month.from, endDate: month.to },
      { tenantId: aurora.id, professionalId: leticia.id, metric: "CLIENTS", targetValue: 8, startDate: month.from, endDate: month.to },
    ],
  });

  const closedComanda = await prisma.comanda.findFirst({
    where: { tenantId: aurora.id, status: "CLOSED" },
    include: { items: true, client: true },
    orderBy: { occurredAt: "desc" },
  });
  if (closedComanda) {
    const amountCents = comandaTotal({
      items: closedComanda.items,
      discountCents: closedComanda.discountCents,
      creditCents: closedComanda.creditCents,
      cashbackCents: closedComanda.cashbackCents,
    });
    await prisma.fiscalInvoice.create({
      data: {
        tenantId: aurora.id,
        comandaId: closedComanda.id,
        clientId: closedComanda.clientId,
        kind: "NFSE",
        status: "AUTHORIZED",
        number: 1,
        series: "1",
        accessKey: buildAccessKey({
          uf: "SP",
          issuedAt: closedComanda.closedAt ?? today,
          cnpj: "12345678000195",
          kind: "NFSE",
          series: "1",
          number: 1,
        }),
        protocol: "LOCAL1",
        environment: "homolog",
        provider: "local",
        amountCents,
        taxCents: taxCentsForKind("NFSE", amountCents, 5),
        issuedAt: closedComanda.closedAt ?? today,
        notes: `Comanda #${closedComanda.number}`,
      },
    });
  }

  await prisma.promotion.create({
    data: {
      tenantId: aurora.id,
      name: "Fim de semana do corte",
      startsOn: zonedDateTime(calendarMonth(today) + "-01", "12:00"),
      endsOn: month.to,
      weekdays: "0,6",
      discountType: "PERCENT",
      discountValue: 20,
      active: true,
      items: { create: [{ type: "SERVICE", serviceId: corteMasc.id }] },
    },
  });

  console.log(
    "Seed ok. Salão: iris.p@example.org / demo1234 · Fornecedor: oscar.d@example.net / demo1234 · Plataforma: nathan.k@example.net / admin1234",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
