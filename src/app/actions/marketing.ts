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
  resolveMarketingAudience,
} from "@/lib/marketing";
import { sendMarketingBatch as dispatchMarketingBatch } from "@/lib/marketing-dispatch";

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
  } catch {
    /* cache miss after a successful write should not hide the result */
  }
}

export async function previewMarketingAudience(formData: FormData) {
  const { session } = await requireTenant();
  const audience = parseMarketingAudience(String(formData.get("audience") ?? ""));
  const tag = String(formData.get("tag") ?? "").trim();
  const inactiveDays = parseInactiveDays(formData.get("inactiveDays"));
  if (audience === "TAG" && !tag) return { error: "Informe a hashtag do público." };
  const clients = await resolveMarketingAudience({
    tenantId: session.tenantId,
    audience,
    tag,
    inactiveDays,
  });
  return {
    ok: true as const,
    count: clients.length,
    capped: clients.length >= MARKETING_CAP,
    label: MARKETING_AUDIENCE_LABEL[audience],
  };
}

export async function createMarketingCampaign(formData: FormData): Promise<MarketingSendResult> {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para disparar campanhas." };

  const body = String(formData.get("body") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || body.slice(0, 48) || "Campanha WhatsApp";
  const audience = parseMarketingAudience(String(formData.get("audience") ?? ""));
  const tag = String(formData.get("tag") ?? "").trim();
  const inactiveDays = parseInactiveDays(formData.get("inactiveDays"));
  if (body.length < 8) return { error: "Escreva a mensagem da campanha." };
  if (audience === "TAG" && !tag) return { error: "Informe a hashtag do público." };

  const clients = await resolveMarketingAudience({
    tenantId: session.tenantId,
    audience,
    tag,
    inactiveDays,
  });
  if (!clients.length) {
    return { error: "Nenhum cliente neste público com WhatsApp e aviso ligado." };
  }

  const campaign = await prisma.marketingCampaign.create({
    data: {
      tenantId: session.tenantId,
      name,
      body,
      audience,
      tag: audience === "TAG" ? tag : null,
      inactiveDays: audience === "INACTIVE" ? inactiveDays : null,
      status: "DRAFT",
      recipients: {
        create: clients.map((client) => ({
          tenantId: session.tenantId,
          clientId: client.id,
          phone: normalizeWhatsAppPhone(client.phone),
          status: "PENDING",
        })),
      },
    },
  });

  const batch = await dispatchMarketingBatch(session.tenantId, campaign.id, allowMockSend());
  refreshMarketing();
  if ("error" in batch) return { error: batch.error ?? "Não foi possível enviar.", campaignId: campaign.id };
  return {
    ok: true as const,
    campaignId: campaign.id,
    sent: batch.sent,
    failed: batch.failed,
    pending: batch.pending,
    mocked: batch.mocked,
  };
}

export async function sendMarketingBatch(formData: FormData): Promise<MarketingSendResult> {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para disparar campanhas." };
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return { error: "Campanha não encontrada." };
  const batch = await dispatchMarketingBatch(session.tenantId, campaignId, allowMockSend());
  refreshMarketing();
  if ("error" in batch) return { error: batch.error ?? "Não foi possível enviar.", campaignId };
  return { ...batch, campaignId };
}

export async function deleteMarketingCampaign(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para excluir." };
  const id = String(formData.get("id") ?? "");
  const row = await prisma.marketingCampaign.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true } });
  if (!row) return { error: "Campanha não encontrada." };
  await prisma.marketingCampaign.delete({ where: { id } });
  refreshMarketing();
  return { ok: true as const };
}
