import { prisma } from "@/lib/db";
import { calendarDate, formatTime, rangeOfCalendarDate, shiftCalendarDate } from "@/lib/dates";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { sendSalonWhatsApp } from "@/lib/whatsapp-send";
import { isConfirmReply, looksLikeReminderPrompt, spin } from "@/lib/whatsapp-copy";
import { chatAsReceptionist } from "@/lib/openai";
import { freeSlotsForProfessional } from "@/lib/assistant";
import {
  DEFAULT_RECEPTIONIST,
  buildReceptionistSystemPrompt,
  formatServicePrice,
  localReceptionistReply,
  normalizeReceptionist,
  wantsHumanHandover,
  type ReceptionistCatalog,
  type ReceptionistConfig,
  type ReceptionistHistoryItem,
} from "@/lib/receptionist";

export async function loadReceptionistConfig(tenantId: string): Promise<ReceptionistConfig> {
  const row = await prisma.receptionist.findUnique({ where: { tenantId } });
  if (!row) return DEFAULT_RECEPTIONIST;
  return normalizeReceptionist({
    enabled: row.enabled,
    name: row.name,
    avatarUrl: row.avatarUrl,
    style: row.style,
    personality: row.personality,
    emoji: row.emoji,
    instructions: row.instructions,
  });
}

export async function ensureReceptionist(tenantId: string) {
  const existing = await prisma.receptionist.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.receptionist.create({
    data: {
      tenantId,
      name: DEFAULT_RECEPTIONIST.name,
      avatarUrl: DEFAULT_RECEPTIONIST.avatarUrl,
      style: DEFAULT_RECEPTIONIST.style,
      personality: DEFAULT_RECEPTIONIST.personality,
      emoji: DEFAULT_RECEPTIONIST.emoji,
    },
  });
}

function slotList(input: {
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  nowHHmm?: string;
  busy: { start: string; end: string }[];
}) {
  return freeSlotsForProfessional(input).filter((_, index) => index % 2 === 0).slice(0, 8);
}

export async function loadReceptionistCatalog(tenantId: string): Promise<ReceptionistCatalog> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, city: true, openTime: true, closeTime: true, slotMinutes: true },
  });
  if (!tenant) {
    return { salon: "Salão", city: null, hours: "—", services: [], professionals: [] };
  }

  const today = calendarDate();
  const tomorrow = shiftCalendarDate(today, 1);
  const todayRange = rangeOfCalendarDate(today);
  const tomorrowRange = rangeOfCalendarDate(tomorrow);
  const nowHHmm = formatTime(new Date());

  const [services, professionals, appointments] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
      select: {
        name: true,
        durationMin: true,
        priceCents: true,
        professionals: { select: { professional: { select: { name: true, active: true } } } },
      },
    }),
    prisma.professional.findMany({
      where: { tenantId, active: true, generateAgenda: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nickname: true, specialty: true, workStart: true, workEnd: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        status: { not: "CANCELLED" },
        startAt: { gte: todayRange.start, lt: tomorrowRange.end },
      },
      select: { professionalId: true, startAt: true, endAt: true },
    }),
  ]);

  return {
    salon: tenant.name,
    city: tenant.city,
    hours: `${tenant.openTime} às ${tenant.closeTime}`,
    services: services.map((service) => ({
      name: service.name,
      durationMin: service.durationMin,
      price: formatServicePrice(service.priceCents),
      professionals: service.professionals
        .filter((row) => row.professional.active)
        .map((row) => row.professional.name),
    })),
    professionals: professionals.map((row) => {
      const openTime = row.workStart || tenant.openTime;
      const closeTime = row.workEnd || tenant.closeTime;
      const todayBusy = appointments
        .filter((item) => item.professionalId === row.id && item.startAt >= todayRange.start && item.startAt < todayRange.end)
        .map((item) => ({ start: formatTime(item.startAt), end: formatTime(item.endAt) }));
      const tomorrowBusy = appointments
        .filter((item) => item.professionalId === row.id && item.startAt >= tomorrowRange.start && item.startAt < tomorrowRange.end)
        .map((item) => ({ start: formatTime(item.startAt), end: formatTime(item.endAt) }));
      return {
        name: row.name,
        nickname: row.nickname,
        specialty: row.specialty,
        today: slotList({
          openTime,
          closeTime,
          slotMinutes: tenant.slotMinutes,
          nowHHmm,
          busy: todayBusy,
        }),
        tomorrow: slotList({
          openTime,
          closeTime,
          slotMinutes: tenant.slotMinutes,
          busy: tomorrowBusy,
        }),
      };
    }),
  };
}

export async function generateReceptionistReply(input: {
  config: ReceptionistConfig;
  catalog: ReceptionistCatalog;
  incoming: string;
  history?: ReceptionistHistoryItem[];
  apiKey?: string | null;
}) {
  const handover = wantsHumanHandover(input.incoming);
  const local = localReceptionistReply({
    config: input.config,
    catalog: input.catalog,
    incoming: input.incoming,
  });
  if (handover) return { text: local.text, handover: true, source: "local" as const };

  try {
    const openai = await chatAsReceptionist({
      apiKey: input.apiKey,
      system: buildReceptionistSystemPrompt(input.config, input.catalog),
      incoming: input.incoming,
      history: input.history,
    });
    if (openai) return { text: openai.slice(0, 700), handover: false, source: "openai" as const };
  } catch {
    // fallback local
  }
  return { text: local.text, handover: false, source: "local" as const };
}

export async function maybeReplyAsReceptionist(input: {
  tenantId: string;
  conversationId: string;
  phone: string;
  incoming: string;
}) {
  const [config, conversation] = await Promise.all([
    loadReceptionistConfig(input.tenantId),
    prisma.conversation.findFirst({
      where: { id: input.conversationId, tenantId: input.tenantId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 12 } },
    }),
  ]);
  if (!config.enabled) return { skipped: "off" as const };
  if (!conversation || conversation.botPaused) return { skipped: "paused" as const };
  if (!conversation.messages.some((row) => row.direction === "IN")) return { skipped: "receptive" as const };

  const lastOut = conversation.messages.find((row) => row.direction === "OUT");
  if (isConfirmReply(input.incoming) && lastOut && looksLikeReminderPrompt(lastOut.body)) {
    await confirmNextAppointment(input.tenantId, conversation.clientId, conversation.phone);
    const text = spin("{Recebi|Combinado|Fechado}! Horário confirmado, te esperamos.");
    await sendSalonWhatsApp({ tenantId: input.tenantId, phone: input.phone, text, presence: true }).catch(() => null);
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUT", body: text, source: "BOT" },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
    return { skipped: null, handover: false, source: "local" as const };
  }

  const catalog = await loadReceptionistCatalog(input.tenantId);
  const integrations = await resolvePlatformIntegrations();
  const history: ReceptionistHistoryItem[] = conversation.messages
    .slice()
    .reverse()
    .slice(-8)
    .map((row) => ({
      role: row.direction === "OUT" ? "assistant" : "user",
      text: row.body,
    }));
  const reply = await generateReceptionistReply({
    config,
    catalog,
    incoming: input.incoming,
    history,
    apiKey: integrations.openaiApiKey,
  });

  if (reply.handover) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { botPaused: true },
    });
  }

  await sendSalonWhatsApp({
    tenantId: input.tenantId,
    phone: input.phone,
    text: reply.text,
    presence: true,
  }).catch(() => null);

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUT",
      body: reply.text,
      source: "BOT",
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
  return { skipped: null, handover: reply.handover, source: reply.source };
}

async function confirmNextAppointment(tenantId: string, clientId: string | null, phone: string) {
  let id = clientId;
  if (!id) {
    const client = await prisma.client.findFirst({
      where: { tenantId, phone: phone.replace(/\D/g, "") },
      select: { id: true },
    });
    id = client?.id ?? null;
  }
  if (!id) return;
  const next = await prisma.appointment.findFirst({
    where: {
      tenantId,
      clientId: id,
      status: "PENDING",
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    select: { id: true },
  });
  if (!next) return;
  await prisma.appointment.update({
    where: { id: next.id },
    data: { status: "CONFIRMED" },
  });
}
