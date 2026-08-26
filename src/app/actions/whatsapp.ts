"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { isEvolutionConfigured, sendTextMessage } from "@/lib/evolution";
import { draftWhatsAppMessage } from "@/lib/openai";

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

  const config = {
    url: tenant.evolutionUrl ?? process.env.EVOLUTION_API_URL ?? "",
    apiKey: tenant.evolutionApiKey ?? process.env.EVOLUTION_API_KEY ?? "",
    instance: tenant.evolutionInstance ?? "",
  };

  if (isEvolutionConfigured(config)) {
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
  return { ok: true, mocked: !isEvolutionConfigured(config) };
}

export async function generateWhatsAppDraft(goal: string, clientName: string) {
  const { tenant } = await requireTenant();
  const text = await draftWhatsAppMessage({
    apiKey: tenant.openaiApiKey,
    goal,
    clientName,
    salonName: tenant.name,
  });
  return { text };
}

export async function saveEvolutionSettings(formData: FormData) {
  const { session } = await requireTenant();
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      evolutionUrl: String(formData.get("evolutionUrl") ?? "") || null,
      evolutionApiKey: String(formData.get("evolutionApiKey") ?? "") || null,
      evolutionInstance: String(formData.get("evolutionInstance") ?? "") || null,
    },
  });
  revalidatePath("/whatsapp");
  revalidatePath("/configuracoes");
  return { ok: true };
}
