"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp-campaigns";
import {
  MARKETING_AUDIENCE_LABEL,
  MARKETING_CAP,
  parseInactiveDays,
  parseMarketingAudience,
  parseRecipientIds,
  resolveMarketingAudience,
} from "@/lib/marketing";
import { sendMarketingRecipients } from "@/lib/marketing-dispatch";

export type MarketingListResult =
  | { ok: true; campaignId: string; pending: number }
  | { error: string };

export type MarketingSendResult =
  | { ok: true; campaignId: string; sent: number; failed: number; pending: number; mocked: number }
  | { error: string; campaignId?: string };

function allowMockSend() {
  return process.env.NODE_ENV !== "production";
}

function refreshMarketing() {
  try {
    revalidatePath("/marketing");
    revalidatePath("/whatsapp");
    revalidatePath("/atendimento");
  } catch {
    /* cache miss after a successful write should not hide the result */
  }
}

async function audienceFromForm(tenantId: string, formData: FormData) {
  const audience = parseMarketingAudience(String(formData.get("audience") ?? ""));
  const tag = String(formData.get("tag") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const inactiveDays = parseInactiveDays(formData.get("inactiveDays"));
  if (audience === "TAG" && !tag) return { error: "Informe a hashtag do público." as const };
  if (audience === "SERVICE" && !serviceId) return { error: "Escolha o serviço para segmentar." as const };
  const clients = await resolveMarketingAudience({
    tenantId,
    audience,
    tag,
    serviceId,
    inactiveDays,
  });
  return { ok: true as const, audience, tag, serviceId, inactiveDays, clients };
}

export async function previewMarketingAudience(formData: FormData) {
  const { session } = await requireTenant();
  const result = await audienceFromForm(session.tenantId, formData);
  if (!result.ok) return { error: result.error };
  return {
    ok: true as const,
    count: result.clients.length,
    capped: result.clients.length >= MARKETING_CAP,
    label: MARKETING_AUDIENCE_LABEL[result.audience],
  };
}

export async function createMarketingCampaign(formData: FormData): Promise<MarketingListResult> {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para montar a lista." };

  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 8) return { error: "Escreva a mensagem que será enviada." };

  const result = await audienceFromForm(session.tenantId, formData);
  if (!result.ok) return { error: result.error };
  if (!result.clients.length) {
    return { error: "Nenhum cliente neste público com WhatsApp e aviso ligado." };
  }

  let serviceName = "";
  if (result.audience === "SERVICE") {
    const service = await prisma.service.findFirst({
      where: { id: result.serviceId, tenantId: session.tenantId },
      select: { name: true },
    });
    serviceName = service?.name ?? "";
  }

  const name =
    String(formData.get("name") ?? "").trim() ||
    serviceName ||
    (result.audience === "TAG" ? `#${result.tag}` : "") ||
    body.slice(0, 48) ||
    "Lista WhatsApp";

  const campaign = await prisma.marketingCampaign.create({
    data: {
      tenantId: session.tenantId,
      name,
      body,
      audience: result.audience,
      tag: result.audience === "TAG" ? result.tag : serviceName || null,
      serviceId: result.audience === "SERVICE" ? result.serviceId : null,
      inactiveDays: result.audience === "INACTIVE" ? result.inactiveDays : null,
      status: "DRAFT",
      recipients: {
        create: result.clients.map((client) => ({
          tenantId: session.tenantId,
          clientId: client.id,
          phone: normalizeWhatsAppPhone(client.phone),
          status: "PENDING",
        })),
      },
    },
  });

  refreshMarketing();
  return { ok: true as const, campaignId: campaign.id, pending: result.clients.length };
}

export async function sendMarketingSelected(formData: FormData): Promise<MarketingSendResult> {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para enviar." };
  const campaignId = String(formData.get("campaignId") ?? "");
  const recipientIds = parseRecipientIds([
    String(formData.get("recipientIds") ?? ""),
    ...formData.getAll("recipientId").map(String),
  ]);
  if (!campaignId) return { error: "Lista não encontrada." };
  const batch = await sendMarketingRecipients(session.tenantId, campaignId, allowMockSend(), recipientIds);
  refreshMarketing();
  if ("error" in batch) return { error: batch.error, campaignId };
  return { ...batch, campaignId };
}

export async function resolveMarketingRecipient(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const resolved = String(formData.get("resolved") ?? "1") !== "0";
  const row = await prisma.marketingRecipient.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, status: true, repliedAt: true },
  });
  if (!row) return { error: "Cliente não encontrado nesta lista." };
  await prisma.marketingRecipient.update({
    where: { id },
    data: {
      status: resolved ? "RESOLVED" : row.repliedAt ? "REPLIED" : "SENT",
    },
  });
  refreshMarketing();
  return { ok: true as const };
}

export async function deleteMarketingCampaign(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para excluir." };
  const id = String(formData.get("id") ?? "");
  const row = await prisma.marketingCampaign.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
  if (!row) return { error: "Lista não encontrada." };
  await prisma.marketingCampaign.delete({ where: { id } });
  refreshMarketing();
  return { ok: true as const };
}
