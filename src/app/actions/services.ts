"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";

export async function upsertService(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const durationMin = Number(formData.get("durationMin") ?? 30);
  const priceCents = parseBRLToCents(String(formData.get("price") ?? "0"));
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const commissionPct = formData.get("commissionPct")
    ? Number(formData.get("commissionPct"))
    : null;

  if (!name) return { error: "Nome do serviço é obrigatório." };

  if (id) {
    await prisma.service.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { name, durationMin, priceCents, categoryId, commissionPct },
    });
  } else {
    await prisma.service.create({
      data: {
        tenantId: session.tenantId,
        name,
        durationMin,
        priceCents,
        categoryId,
        commissionPct,
      },
    });
  }
  revalidatePath("/servicos");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function toggleService(id: string, active: boolean) {
  const { session } = await requireTenant();
  await prisma.service.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { active },
  });
  revalidatePath("/servicos");
  return { ok: true };
}
