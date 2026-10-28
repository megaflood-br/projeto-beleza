import { prisma } from "@/lib/db";
import { isEvolutionConfigured, sendTextMessage } from "@/lib/evolution";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { evolutionSendFailure, toEvolutionNumber } from "@/lib/whatsapp-campaigns";
import {
  MARKETING_SEND_GAP_MS,
  MARKETING_SEND_MAX,
  nextCampaignStatus,
  renderMarketingBody,
  summarizeMarketing,
} from "@/lib/marketing";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendMarketingRecipient(input: {
  tenantId: string;
  salonName: string;
  clientId: string;
  clientName: string;
  phone: string;
  body: string;
  allowMock: boolean;
  connected: boolean;
  evolution: { url: string; apiKey: string; instance: string };
}) {
  const body = renderMarketingBody(input.body, { nome: input.clientName, salao: input.salonName });
  if (!body) return { error: "Mensagem vazia." };

  if (!input.connected && !input.allowMock) {
    return { error: "Conecte o WhatsApp na aba Conexão para disparar." };
  }

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_phone: { tenantId: input.tenantId, phone: input.phone } },
    update: { lastMessageAt: new Date(), clientId: input.clientId },
    create: { tenantId: input.tenantId, phone: input.phone, clientId: input.clientId, lastMessageAt: new Date() },
  });

  let mocked = true;
  if (input.connected && isEvolutionConfigured(input.evolution)) {
    try {
      await sendTextMessage(input.evolution, toEvolutionNumber(input.phone), body);
      mocked = false;
    } catch (error) {
      if (!input.allowMock) return { error: evolutionSendFailure(error) };
    }
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "OUT", body },
  });

  return { ok: true as const, mocked, conversationId: conversation.id };
}

export type MarketingBatchResult =
  | { ok: true; sent: number; failed: number; pending: number; mocked: number }
  | { error: string };

export async function sendMarketingRecipients(
  tenantId: string,
  campaignId: string,
  allowMock: boolean,
  recipientIds: string[],
): Promise<MarketingBatchResult> {
  const ids = [...new Set(recipientIds.filter(Boolean))].slice(0, MARKETING_SEND_MAX);
  if (!ids.length) return { error: "Selecione ao menos um cliente para enviar." };

  const [tenant, campaign] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, evolutionInstance: true, evolutionStatus: true },
    }),
    prisma.marketingCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { recipients: { select: { status: true } } },
    }),
  ]);
  if (!tenant || !campaign) return { error: "Lista não encontrada." };

  const pending = await prisma.marketingRecipient.findMany({
    where: { campaignId, tenantId, id: { in: ids }, status: { in: ["PENDING", "FAILED"] } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  if (!pending.length) {
    const summary = summarizeMarketing(campaign.recipients);
    const status = nextCampaignStatus(summary.pending, Boolean(campaign.sentAt) || summary.sent + summary.failed + summary.replied + summary.resolved > 0);
    if (campaign.status !== status) {
      await prisma.marketingCampaign.update({ where: { id: campaignId }, data: { status } });
    }
    return { error: "Nenhum dos selecionados está pendente." };
  }

  const server = await resolvePlatformIntegrations();
  const evolution = {
    url: server.evolutionUrl,
    apiKey: server.evolutionApiKey,
    instance: tenant.evolutionInstance ?? "",
  };
  const connected = tenant.evolutionStatus === "open" && isEvolutionConfigured(evolution);
  if (!connected && !allowMock) {
    return { error: "Conecte o WhatsApp na aba Conexão para disparar a campanha." };
  }

  let sent = 0;
  let failed = 0;
  let mocked = 0;
  let firstSentAt: Date | null = campaign.sentAt;
  for (const [index, row] of pending.entries()) {
    if (index > 0) await wait(MARKETING_SEND_GAP_MS);
    const now = new Date();
    const result = await sendMarketingRecipient({
      tenantId,
      salonName: tenant.name,
      clientId: row.clientId,
      clientName: row.client.name,
      phone: row.phone,
      body: campaign.body,
      allowMock,
      connected,
      evolution,
    });
    if ("error" in result) {
      failed += 1;
      await prisma.marketingRecipient.update({
        where: { id: row.id },
        data: { status: "FAILED", error: result.error, sentAt: now },
      });
      continue;
    }
    sent += 1;
    if (result.mocked) mocked += 1;
    if (!firstSentAt) firstSentAt = now;
    await prisma.marketingRecipient.update({
      where: { id: row.id },
      data: {
        status: "SENT",
        error: null,
        sentAt: now,
        conversationId: result.conversationId,
      },
    });
  }

  const remaining = await prisma.marketingRecipient.count({
    where: { campaignId, tenantId, status: "PENDING" },
  });
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      status: nextCampaignStatus(remaining, true),
      sentAt: firstSentAt ?? new Date(),
    },
  });

  return { ok: true as const, sent, failed, pending: remaining, mocked };
}
