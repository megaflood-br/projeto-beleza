"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canAccess } from "@/lib/permissions";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { saveReceptionistAvatar } from "@/lib/product-upload";
import {
  generateReceptionistReply,
  ensureReceptionist,
  loadReceptionistCatalog,
  loadReceptionistConfig,
} from "@/lib/receptionist-runtime";
import {
  DEFAULT_RECEPTIONIST,
  isReceptionistEmoji,
  isReceptionistPersonality,
  isReceptionistStyle,
  normalizeReceptionist,
} from "@/lib/receptionist";

function revalidateReceptionist() {
  revalidatePath("/recepcionista");
  revalidatePath("/atendimento");
  revalidatePath("/", "layout");
}

export async function saveReceptionist(formData: FormData) {
  const { session, access } = await requireTenant();
  if (!canAccess(access, "receptionist", "edit")) return { error: "Sem permissão para configurar a recepcionista." };

  const current = await ensureReceptionist(session.tenantId);
  const avatarRaw = String(formData.get("avatarUrl") ?? "").trim();
  const avatarUrl = await saveReceptionistAvatar(session.tenantId, avatarRaw || null, current.avatarUrl);
  const name = String(formData.get("name") ?? "").trim() || DEFAULT_RECEPTIONIST.name;
  const style = String(formData.get("style") ?? "");
  const personality = String(formData.get("personality") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";

  await prisma.receptionist.update({
    where: { tenantId: session.tenantId },
    data: {
      enabled,
      name: name.slice(0, 40),
      avatarUrl,
      style: isReceptionistStyle(style) ? style : DEFAULT_RECEPTIONIST.style,
      personality: isReceptionistPersonality(personality) ? personality : DEFAULT_RECEPTIONIST.personality,
      emoji: isReceptionistEmoji(emoji) ? emoji : DEFAULT_RECEPTIONIST.emoji,
      instructions: String(formData.get("instructions") ?? "").trim().slice(0, 500),
    },
  });
  revalidateReceptionist();
  return { ok: true as const };
}

export async function testReceptionist(formData: FormData) {
  const { session, access } = await requireTenant();
  if (!canAccess(access, "receptionist")) return { error: "Sem permissão." };
  const incoming = String(formData.get("message") ?? "").trim();
  if (!incoming) return { error: "Escreva uma mensagem para testar." };
  const historyRaw = String(formData.get("history") ?? "[]");
  let history: { role: "user" | "assistant"; text: string }[] = [];
  try {
    const parsed = JSON.parse(historyRaw) as { role?: string; text?: string }[];
    if (Array.isArray(parsed)) {
      history = parsed
        .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.text)
        .map((item) => ({ role: item.role as "user" | "assistant", text: String(item.text) }))
        .slice(-8);
    }
  } catch {
    history = [];
  }

  const [config, catalog, integrations] = await Promise.all([
    loadReceptionistConfig(session.tenantId),
    loadReceptionistCatalog(session.tenantId),
    resolvePlatformIntegrations(),
  ]);
  const live = normalizeReceptionist({
    ...config,
    name: String(formData.get("name") ?? config.name),
    style: String(formData.get("style") ?? config.style) as typeof config.style,
    personality: String(formData.get("personality") ?? config.personality) as typeof config.personality,
    emoji: String(formData.get("emoji") ?? config.emoji) as typeof config.emoji,
    instructions: String(formData.get("instructions") ?? config.instructions),
  });
  const reply = await generateReceptionistReply({
    config: live,
    catalog,
    incoming,
    history,
    apiKey: integrations.openaiApiKey,
  });
  return { text: reply.text, handover: reply.handover, source: reply.source };
}

export async function setConversationBotPaused(formData: FormData) {
  const { session, access } = await requireTenant();
  if (!canAccess(access, "atendimento", "edit") && !canAccess(access, "receptionist", "edit")) {
    return { error: "Sem permissão." };
  }
  const conversationId = String(formData.get("conversationId") ?? "");
  const paused = String(formData.get("paused") ?? "") === "1";
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: session.tenantId },
    select: { id: true },
  });
  if (!conversation) return { error: "Conversa não encontrada." };
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { botPaused: paused },
  });
  revalidatePath("/atendimento");
  return { ok: true as const };
}