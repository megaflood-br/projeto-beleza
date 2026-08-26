"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function saveSettings(formData: FormData) {
  const { session } = await requireTenant();
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      name: String(formData.get("name") ?? "").trim() || undefined,
      tradeName: String(formData.get("tradeName") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      city: String(formData.get("city") ?? "") || null,
      openTime: String(formData.get("openTime") ?? "08:00"),
      closeTime: String(formData.get("closeTime") ?? "20:00"),
      openaiApiKey: String(formData.get("openaiApiKey") ?? "") || null,
      reminderHours: Number(formData.get("reminderHours") ?? 24),
    },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { ok: true };
}
