"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { isEvolutionConfigured, logoutEvolutionInstance, sendTextMessage } from "@/lib/evolution";
import { draftWhatsAppMessage } from "@/lib/openai";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { provisionWhatsAppInstance } from "@/lib/whatsapp-live";

export async function sendWhatsApp(formData: FormData) {
  const { session, tenant } = await requireTenant();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const body = String(formData.get("body") ?? "").trim();
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!phone || !body) return { error: "Telefone e mensagem são obrigatórios." };

  const conversation =
    (conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, tenantId: session.tenantId },
        })
      : null) ??
    (await prisma.conversation.upsert({
      where: { tenantId_phone: { tenantId: session.tenantId, phone } },
      update: { lastMessageAt: new Date() },
      create: { tenantId: session.tenantId, phone, lastMessageAt: new Date() },
    }));

  const server = await resolvePlatformIntegrations();
  const config = {
    url: server.evolutionUrl,
    apiKey: server.evolutionApiKey,
    instance: tenant.evolutionInstance ?? "",
  };

  if (isEvolutionConfigured(config) && tenant.evolutionStatus === "open") {
    await sendTextMessage(config, phone, body);
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUT",
      body,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unread: 0 },
  });

  revalidatePath("/whatsapp");
  revalidatePath("/marketing");
  return { ok: true, mocked: !(isEvolutionConfigured(config) && tenant.evolutionStatus === "open") };
}

export async function generateWhatsAppDraft(goal: string, clientName: string) {
  const { tenant } = await requireTenant();
  const integrations = await resolvePlatformIntegrations();
  const text = await draftWhatsAppMessage({
    apiKey: integrations.openaiApiKey,
    goal,
    clientName,
    salonName: tenant.name,
  });
  return { text };
}

export async function connectWhatsAppInstance() {
  const { session } = await requireTenant();
  try {
    const result = await provisionWhatsAppInstance(session.tenantId);
    revalidatePath("/whatsapp");
    revalidatePath("/marketing");
    return { ok: true as const, qr: result.qr };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível gerar o QR Code." };
  }
}

export async function disconnectWhatsAppInstance() {
  const { session, tenant } = await requireTenant();
  const server = await resolvePlatformIntegrations();
  if (server.hasEvolution && tenant.evolutionInstance) {
    try {
      await logoutEvolutionInstance({
        url: server.evolutionUrl,
        apiKey: server.evolutionApiKey,
        instance: tenant.evolutionInstance,
      });
    } catch {
      // still clear local status
    }
  }
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { evolutionStatus: "close", evolutionNumber: null },
  });
  revalidatePath("/whatsapp");
  revalidatePath("/marketing");
  return { ok: true as const };
}
