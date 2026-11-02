import { prisma } from "@/lib/db";
import { markMarketingReplies } from "@/lib/marketing";
import { maybeReplyAsReceptionist } from "@/lib/receptionist-runtime";
import { normalizeWhatsAppProvider, type WhatsAppProvider } from "@/lib/whatsapp-meta";

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
