import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMinutes } from "date-fns";
import { calendarDate, zonedDateTime } from "../src/lib/dates";

const prisma = new PrismaClient();

function at(day: Date, hour: number, minute = 0) {
  return zonedDateTime(calendarDate(day), `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

async function main() {
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
  await prisma.appointmentItem.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.serviceProduct.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.client.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const today = zonedDateTime(calendarDate(), "12:00");

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
      accentColor: "#2563EB",
      openTime: "08:00",
      closeTime: "20:00",
    },
  });

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

  await prisma.user.create({
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

  const tinta = await prisma.product.create({
    data: {
      tenantId: aurora.id,
      name: "Tinta profissional 60ml",
      sku: "TIN-60",
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
      name: "Máscara hidratação 500ml",
      sku: "HID-500",
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
      name: "Esmalte gel rose",
      sku: "GEL-ROSE",
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
      name: "Shampoo profissional 1L",
      sku: "SHA-1L",
      unit: "un",
      costCents: 3500,
      saleCents: 7900,
      stock: 15,
      minStock: 5,
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
    { name: "Patrícia Souza", phone: "11991110009", tags: "inativa" },
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
      await prisma.transaction.create({
        data: {
          tenantId: aurora.id,
          type: "INCOME",
          category: "servico",
          amountCents: service.priceCents,
          method: "PIX",
          description: service.name,
          appointmentId: appointment.id,
          occurredAt: opts.start,
        },
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

  await prisma.transaction.createMany({
    data: [
      {
        tenantId: aurora.id,
        type: "EXPENSE",
        category: "aluguel",
        amountCents: 450000,
        method: "TRANSFER",
        organizational: true,
        account: "nenhuma",
        description: "Aluguel do ponto",
        occurredAt: at(today, 8, 0),
      },
      {
        tenantId: aurora.id,
        type: "EXPENSE",
        category: "fornecedor",
        amountCents: 62000,
        method: "PIX",
        supplier: "Beauty Supply SP",
        description: "Reposição de tinta e máscaras",
        occurredAt: at(addDays(today, -2), 14, 0),
      },
      {
        tenantId: aurora.id,
        type: "EXPENSE",
        category: "comissao",
        amountCents: 16200,
        method: "PIX",
        professionalId: camila.id,
        description: "Pagamento de comissão para Camila Ferreira",
        occurredAt: at(addDays(today, -1), 18, 0),
      },
      {
        tenantId: aurora.id,
        type: "INCOME",
        category: "produto",
        amountCents: 8900,
        method: "PIX",
        description: "Venda máscara hidratação",
        occurredAt: at(today, 13, 0),
      },
    ],
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
      plan: "starter",
    },
  });
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

  console.log("Seed ok. Login: iris.p@example.org / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
