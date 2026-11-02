import { prisma } from "@/lib/db";
import { markMarketingReplies } from "@/lib/marketing";
import { maybeReplyAsReceptionist } from "@/lib/receptionist-runtime";
import { botPausedUntilFromNow } from "@/lib/whatsapp-copy";
import { normalizeWhatsAppProvider, type WhatsAppProvider } from "@/lib/whatsapp-meta";

async function duplicateMessage(conversationId: string, waId?: string | null) {
  if (!waId) return null;
  return prisma.message.findFirst({
    where: { conversationId, waId },
    select: { id: true, direction: true, body: true },
  });
}

export async function ingestOutboundFromDevice(input: {
  tenantId: string;
  phone: string;
  body: string;
  waId?: string | null;
}) {
  const phone = input.phone.replace(/\D/g, "");
  const body = input.body.trim();
  if (!phone || !body) return { skipped: "empty" as const };

  const client = await prisma.client.findFirst({
    where: { tenantId: input.tenantId, phone },
    select: { id: true },
  });
  const pausedUntil = botPausedUntilFromNow();
  const conversation = await prisma.conversation.upsert({
    where: { tenantId_phone: { tenantId: input.tenantId, phone } },
    update: { lastMessageAt: new Date(), clientId: client?.id, botPausedUntil: pausedUntil },
    create: {
      tenantId: input.tenantId,
      phone,
      clientId: client?.id,
      lastMessageAt: new Date(),
      botPausedUntil: pausedUntil,
    },
  });

  const existing = await duplicateMessage(conversation.id, input.waId);
  if (existing) return { skipped: "duplicate" as const, conversationId: conversation.id };

  const echo = await prisma.message.findFirst({
    where: {
      conversationId: conversation.id,
      direction: "OUT",
      body,
      createdAt: { gte: new Date(Date.now() - 20_000) },
    },
    select: { id: true, waId: true },
  });
  if (echo) {
    if (input.waId && !echo.waId) {
      await prisma.message.update({ where: { id: echo.id }, data: { waId: input.waId } });
    }
    return { skipped: "echo" as const, conversationId: conversation.id };
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUT",
      body,
      source: "HUMAN",
      waId: input.waId || undefined,
    },
  });
  return { skipped: null, conversationId: conversation.id };
}

export async function ingestInboundWhatsApp(input: {
  tenantId: string;
  phone: string;
  body: string;
  waId?: string | null;
  channel: WhatsAppProvider;
}) {
  const phone = input.phone.replace(/\D/g, "");
  const body = input.body.trim();
  if (!phone || !body) return { skipped: "empty" as const };

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { whatsappProvider: true },
  });
  const client = await prisma.client.findFirst({
    where: { tenantId: input.tenantId, phone },
  });
  const existingConversation = await prisma.conversation.findUnique({
    where: { tenantId_phone: { tenantId: input.tenantId, phone } },
    select: { id: true },
  });
  if (existingConversation) {
    const existing = await duplicateMessage(existingConversation.id, input.waId);
    if (existing) return { skipped: "duplicate" as const, conversationId: existingConversation.id };
  }

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_phone: { tenantId: input.tenantId, phone } },
    update: { lastMessageAt: new Date(), unread: { increment: 1 }, clientId: client?.id },
    create: { tenantId: input.tenantId, phone, clientId: client?.id, lastMessageAt: new Date(), unread: 1 },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "IN",
      body,
      waId: input.waId || undefined,
    },
  });

  await markMarketingReplies({
    tenantId: input.tenantId,
    phone,
    body,
    conversationId: conversation.id,
  }).catch(() => 0);

  const active = normalizeWhatsAppProvider(tenant?.whatsappProvider);
  if (active !== input.channel) return { skipped: "other-channel" as const, conversationId: conversation.id };

  await maybeReplyAsReceptionist({
    tenantId: input.tenantId,
    conversationId: conversation.id,
    phone,
    incoming: body,
  }).catch(() => null);

  return { skipped: null, conversationId: conversation.id };
}
