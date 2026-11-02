import { prisma } from "@/lib/db";
import { calendarDate, formatTime } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { hasInboundWhatsAppChat, sendSalonWhatsApp } from "@/lib/whatsapp-send";
import { PROACTIVE_CAMPAIGN_TRIGGERS, spin } from "@/lib/whatsapp-copy";
import {
  appointmentPin,
  bookingLink,
  campaignByTrigger,
  normalizeCampaignTrigger,
  normalizeWhatsAppPhone,
  renderCampaignTemplate,
  type CampaignTrigger,
} from "@/lib/whatsapp-campaigns";

export type CampaignVars = {
  data?: string;
  hora?: string;
  profissional?: string;
  servico?: string;
  valor?: string;
  link?: string;
  pin?: string;
};

async function alreadySent(tenantId: string, trigger: CampaignTrigger, clientId: string, sentOn: string) {
  const row = await prisma.campaignSend.findUnique({
    where: { tenantId_trigger_clientId_sentOn: { tenantId, trigger, clientId, sentOn } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function dispatchCampaign(input: {
  tenantId: string;
  trigger: CampaignTrigger | string;
  client: { id: string; name: string; phone: string | null };
  sentOn: string;
  vars?: CampaignVars;
  force?: boolean;
  templateOverride?: string;
}) {
  const trigger = normalizeCampaignTrigger(String(input.trigger));
  if (!trigger) return { skipped: true as const, reason: "Campanha desconhecida." };
  const phone = normalizeWhatsAppPhone(input.client.phone ?? "");
  if (phone.length < 10) return { skipped: true as const, reason: "Informe um celular com DDD." };

  const [tenant, automation, server] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { name: true, slug: true },
    }),
    prisma.automation.findFirst({ where: { tenantId: input.tenantId, trigger } }),
    resolvePlatformIntegrations(),
  ]);
  if (!tenant) return { skipped: true as const, reason: "Salão não encontrado." };
  if (!automation) return { skipped: true as const, reason: "Campanha ainda não foi criada." };
  if (!input.force && !automation.active) return { skipped: true as const, reason: "Envio automático desligado." };
  if (!input.force && (await alreadySent(input.tenantId, trigger, input.client.id, input.sentOn))) {
    return { skipped: true as const, reason: "Já enviada." };
  }
  if (
    !input.force &&
    (PROACTIVE_CAMPAIGN_TRIGGERS as readonly string[]).includes(trigger) &&
    !(await hasInboundWhatsAppChat(input.tenantId, phone))
  ) {
    return { skipped: true as const, reason: "Lembrete só vai para quem já conversou neste WhatsApp." };
  }

  const catalog = campaignByTrigger(trigger);
  const body = spin(
    renderCampaignTemplate(input.templateOverride || automation.template || catalog?.template || "", {
    nome: input.client.name,
    salao: tenant.name,
    data: input.vars?.data,
    hora: input.vars?.hora,
    profissional: input.vars?.profissional,
    servico: input.vars?.servico,
    valor: input.vars?.valor,
    link: input.vars?.link || bookingLink(server.publicAppUrl, tenant.slug),
    pin: input.vars?.pin,
    }),
  );
  if (!body) return { skipped: true as const, reason: "Mensagem vazia." };

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_phone: { tenantId: input.tenantId, phone } },
    update: { lastMessageAt: new Date(), clientId: input.client.id },
    create: { tenantId: input.tenantId, phone, clientId: input.client.id, lastMessageAt: new Date() },
  });

  const sent = await sendSalonWhatsApp({ tenantId: input.tenantId, phone, text: body, presence: true });
  if (!sent.sent && sent.error && !/Conecte/.test(sent.error)) {
    return { skipped: true as const, reason: sent.error };
  }
  const mocked = !sent.sent;

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "OUT", body },
  });
  await prisma.campaignSend.upsert({
    where: {
      tenantId_trigger_clientId_sentOn: {
        tenantId: input.tenantId,
        trigger,
        clientId: input.client.id,
        sentOn: input.sentOn,
      },
    },
    update: {},
    create: { tenantId: input.tenantId, trigger, clientId: input.client.id, sentOn: input.sentOn },
  });
  return { ok: true as const, mocked };
}

export function safeDispatch(input: Parameters<typeof dispatchCampaign>[0]) {
  void dispatchCampaign(input).catch((error) => {
    console.error("campaign dispatch", input.trigger, error);
  });
}

export function appointmentCampaignVars(appointment: {
  id: string;
  startAt: Date;
  professional?: { name: string } | null;
  items?: { service?: { name: string } | null }[];
}) {
  return {
    data: calendarDate(appointment.startAt),
    hora: formatTime(appointment.startAt),
    profissional: appointment.professional?.name ?? "",
    servico: appointment.items?.map((item) => item.service?.name).filter(Boolean).join(", ") ?? "",
    pin: appointmentPin(appointment.id),
  };
}

export function moneyVar(cents: number) {
  return formatBRL(cents);
}
