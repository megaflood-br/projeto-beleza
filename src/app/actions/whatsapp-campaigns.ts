"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import {
  campaignByTrigger,
  normalizeCampaignTrigger,
  normalizeWhatsAppPhone,
  whatsappPhoneCandidates,
} from "@/lib/whatsapp-campaigns";
import { dispatchCampaign } from "@/lib/dispatch-whatsapp-campaign";
import { ensureWhatsAppCampaigns } from "@/lib/ensure-campaigns";
import { runDueCampaigns } from "@/lib/run-due-campaigns";
import { calendarDate } from "@/lib/dates";
import { formatPhoneBR } from "@/lib/utils";

export async function toggleWhatsAppCampaign(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para alterar campanhas." };
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  const row = await prisma.automation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "Campanha não encontrada." };
  await prisma.automation.update({ where: { id }, data: { active } });
  revalidatePath("/whatsapp");
  revalidatePath("/marketing");
  return { ok: true as const };
}

export async function saveWhatsAppCampaign(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para alterar campanhas." };
  const id = String(formData.get("id") ?? "");
  const template = String(formData.get("template") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "1";
  if (template.length < 8) return { error: "Escreva a mensagem da campanha." };
  const row = await prisma.automation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "Campanha não encontrada." };
  await prisma.automation.update({ where: { id }, data: { template, active } });
  revalidatePath("/whatsapp");
  revalidatePath("/marketing");
  return { ok: true as const };
}

export async function sendCampaignTest(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para enviar." };
  const id = String(formData.get("id") ?? "");
  const phone = normalizeWhatsAppPhone(String(formData.get("phone") ?? ""));
  const templateOverride = String(formData.get("template") ?? "").trim();
  if (phone.length < 10) return { error: "Informe um celular com DDD para testar." };
  const row = await prisma.automation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "Campanha não encontrada." };
  const trigger = normalizeCampaignTrigger(row.trigger);
  if (!trigger) return { error: "Campanha inválida." };

  const candidates = whatsappPhoneCandidates(phone);
  let client = await prisma.client.findFirst({
    where: { tenantId: session.tenantId, phone: { in: candidates } },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        tenantId: session.tenantId,
        name: "Teste WhatsApp",
        phone,
        source: "whatsapp-teste",
      },
    });
  }

  const catalog = campaignByTrigger(trigger);
  try {
    const result = await dispatchCampaign({
      tenantId: session.tenantId,
      trigger,
      client,
      sentOn: `test-${id}-${Date.now()}`,
      force: true,
      templateOverride: templateOverride || undefined,
      vars: {
        data: calendarDate(),
        hora: "14:00",
        profissional: "Equipe",
        servico: catalog?.title ?? "Serviço",
        valor: "R$ 50,00",
        pin: "1234",
      },
    });
    if ("reason" in result) return { error: result.reason };
    try {
      revalidatePath("/whatsapp");
      revalidatePath("/marketing");
    } catch {
      /* cache miss after a successful send should not hide the result */
    }
    if (result.mocked) {
      return {
        ok: true as const,
        mocked: true,
        message: `WhatsApp não está conectado. A mensagem para ${formatPhoneBR(phone)} foi gravada no Inbox, mas não saiu no celular.`,
      };
    }
    return {
      ok: true as const,
      mocked: false,
      message: `Mensagem enviada para ${formatPhoneBR(phone)}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? `Falha ao enviar: ${error.message}` : "Não foi possível enviar o teste.",
    };
  }
}

export async function refreshWhatsAppCampaigns() {
  const { session } = await requireTenant();
  await ensureWhatsAppCampaigns(session.tenantId);
  const due = await runDueCampaigns(session.tenantId);
  revalidatePath("/whatsapp");
  revalidatePath("/marketing");
  return { ok: true as const, sent: due.sent };
}
