"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { campaignByTrigger, normalizeCampaignTrigger } from "@/lib/whatsapp-campaigns";
import { dispatchCampaign } from "@/lib/dispatch-whatsapp-campaign";
import { ensureWhatsAppCampaigns } from "@/lib/ensure-campaigns";
import { runDueCampaigns } from "@/lib/run-due-campaigns";
import { calendarDate } from "@/lib/dates";

export async function toggleWhatsAppCampaign(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para alterar campanhas." };
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  const row = await prisma.automation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "Campanha não encontrada." };
  await prisma.automation.update({ where: { id }, data: { active } });
  revalidatePath("/whatsapp");
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
  return { ok: true as const };
}

export async function sendCampaignTest(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para enviar." };
  const id = String(formData.get("id") ?? "");
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const row = await prisma.automation.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "Campanha não encontrada." };
  const trigger = normalizeCampaignTrigger(row.trigger);
  if (!trigger) return { error: "Campanha inválida." };
  const client =
    (phone
      ? await prisma.client.findFirst({ where: { tenantId: session.tenantId, phone } })
      : await prisma.client.findFirst({ where: { tenantId: session.tenantId, phone: { not: "" } }, orderBy: { updatedAt: "desc" } }));
  if (!client) return { error: "Cadastre um cliente com celular para testar." };
  const catalog = campaignByTrigger(trigger);
  const result = await dispatchCampaign({
    tenantId: session.tenantId,
    trigger,
    client,
    sentOn: `test-${id}-${Date.now()}`,
    force: true,
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
  revalidatePath("/whatsapp");
  return { ok: true as const, mocked: result.mocked };
}

export async function refreshWhatsAppCampaigns() {
  const { session } = await requireTenant();
  await ensureWhatsAppCampaigns(session.tenantId);
  const due = await runDueCampaigns(session.tenantId);
  revalidatePath("/whatsapp");
  return { ok: true as const, sent: due.sent };
}
