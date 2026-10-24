"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";

function keep(current: string | null, next: string) {
  const value = next.trim();
  if (!value || value.includes("••••")) return current;
  return value;
}

export async function savePlatformIntegrations(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  const openai = keep(tenant.openaiApiKey, String(formData.get("openaiApiKey") ?? ""));
  const evolutionUrl = keep(tenant.evolutionUrl, String(formData.get("evolutionUrl") ?? ""));
  const evolutionKey = keep(tenant.evolutionApiKey, String(formData.get("evolutionApiKey") ?? ""));
  const publicAppUrl = String(formData.get("publicAppUrl") ?? "").trim().replace(/\/$/, "") || null;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      openaiApiKey: openai,
      evolutionUrl,
      evolutionApiKey: evolutionKey,
      publicAppUrl,
    },
  });
  revalidatePath("/plataforma/integracoes");
  revalidatePath("/whatsapp");
  revalidatePath("/ia");
  return { ok: true as const };
}
