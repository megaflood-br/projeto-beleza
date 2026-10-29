"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { publicAppOrigin } from "@/lib/public-url";

function keep(current: string | null, next: string) {
  const value = next.trim();
  if (!value || value.includes("••••")) return current;
  return value;
}

function revalidateIntegrations() {
  revalidatePath("/plataforma/integracoes");
  revalidatePath("/whatsapp");
  revalidatePath("/marketing");
  revalidatePath("/ia");
  revalidatePath("/configuracoes");
  revalidatePath("/notas");
  revalidatePath("/pops");
}

export async function saveOpenAiIntegration(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { openaiApiKey: keep(tenant.openaiApiKey, String(formData.get("openaiApiKey") ?? "")) },
  });
  revalidateIntegrations();
  return { ok: true as const };
}

export async function saveContoraIntegration(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { contoraApiToken: keep(tenant.contoraApiToken, String(formData.get("contoraApiToken") ?? "")) },
  });
  revalidateIntegrations();
  return { ok: true as const };
}

export async function saveEvolutionIntegration(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      evolutionUrl: keep(tenant.evolutionUrl, String(formData.get("evolutionUrl") ?? "")),
      evolutionApiKey: keep(tenant.evolutionApiKey, String(formData.get("evolutionApiKey") ?? "")),
      publicAppUrl: publicAppOrigin(String(formData.get("publicAppUrl") ?? ""), false) || null,
    },
  });
  revalidateIntegrations();
  return { ok: true as const };
}
