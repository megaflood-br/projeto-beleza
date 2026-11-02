"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { logoutEvolutionInstance } from "@/lib/evolution";
import { draftWhatsAppMessage } from "@/lib/openai";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { provisionWhatsAppInstance } from "@/lib/whatsapp-live";
import { sendSalonWhatsApp } from "@/lib/whatsapp-send";
import { isWhatsAppProvider, newMetaVerifyToken, readMetaPhone } from "@/lib/whatsapp-meta";

function revalidateWhatsApp() {
  revalidatePath("/whatsapp");
  revalidatePath("/atendimento");
  revalidatePath("/marketing");
  revalidatePath("/configuracoes");
  revalidatePath("/recepcionista");
}

function keep(current: string | null | undefined, next: string) {
  const value = next.trim();
  if (!value || value.includes("••••")) return current ?? null;
  return value;
}

export async function sendWhatsApp(formData: FormData) {
  const { session } = await requireTenant();
  const body = String(formData.get("body") ?? "").trim();
  const conversationId = String(formData.get("conversationId") ?? "");
  let phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  if (!body) return { error: "Mensagem é obrigatória." };

  const existingConversation = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, tenantId: session.tenantId },
      })
    : null;
  if (existingConversation) phone = existingConversation.phone.replace(/\D/g, "") || existingConversation.phone;
  if (!phone) return { error: "Telefone e mensagem são obrigatórios." };

  const conversation =
    existingConversation ??
    (await prisma.conversation.upsert({
      where: { tenantId_phone: { tenantId: session.tenantId, phone } },
      update: { lastMessageAt: new Date() },
      create: { tenantId: session.tenantId, phone, lastMessageAt: new Date() },
    }));

  const sent = await sendSalonWhatsApp({ tenantId: session.tenantId, phone, text: body });
  if (!sent.sent && sent.error && !/Conecte/.test(sent.error)) {
    return { error: sent.error };
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUT",
      body,
      source: "HUMAN",
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unread: 0, botPaused: true },
  });

  revalidateWhatsApp();
  return { ok: true, mocked: !sent.sent };
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
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: { whatsappProvider: "evolution" },
    });
    revalidateWhatsApp();
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
  revalidateWhatsApp();
  return { ok: true as const };
}

export async function setWhatsAppProvider(formData: FormData) {
  const { session } = await requireTenant();
  const provider = String(formData.get("provider") ?? "");
  if (!isWhatsAppProvider(provider)) return { error: "Método de conexão inválido." };
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { whatsappProvider: provider },
  });
  revalidateWhatsApp();
  return { ok: true as const };
}

export async function saveOfficialWhatsApp(formData: FormData) {
  const { session, tenant } = await requireTenant();
  const phoneNumberId = String(formData.get("metaPhoneNumberId") ?? "").trim();
  const wabaId = String(formData.get("metaWabaId") ?? "").trim();
  const accessToken = keep(tenant.metaAccessToken, String(formData.get("metaAccessToken") ?? ""));
  if (!phoneNumberId) return { error: "Informe o Phone Number ID da Meta." };
  if (!accessToken) return { error: "Informe o token permanente da Cloud API." };

  const server = await resolvePlatformIntegrations();
  try {
    const live = await readMetaPhone({
      phoneNumberId,
      accessToken,
      graphVersion: server.metaGraphVersion,
    });
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        whatsappProvider: "official",
        metaPhoneNumberId: phoneNumberId,
        metaAccessToken: accessToken,
        metaWabaId: wabaId || tenant.metaWabaId,
        metaVerifyToken: tenant.metaVerifyToken || newMetaVerifyToken(),
        metaNumber: live.number,
        metaStatus: "open",
      },
    });
    revalidateWhatsApp();
    return { ok: true as const, number: live.number };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível validar a API oficial." };
  }
}

export async function disconnectOfficialWhatsApp() {
  const { session } = await requireTenant();
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { metaStatus: "close" },
  });
  revalidateWhatsApp();
  return { ok: true as const };
}
