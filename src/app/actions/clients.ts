"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function upsertClient(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");
  const email = String(formData.get("email") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  const tags = String(formData.get("tags") ?? "");
  const instagram = String(formData.get("instagram") ?? "") || null;
  const birthRaw = String(formData.get("birthDate") ?? "");
  const birthDate = birthRaw ? new Date(`${birthRaw}T12:00:00.000Z`) : null;

  if (!name || !phone) return { error: "Nome e telefone são obrigatórios." };

  if (id) {
    await prisma.client.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { name, phone, email, notes, tags, instagram, birthDate },
    });
  } else {
    const duplicate = await prisma.client.findFirst({
      where: { tenantId: session.tenantId, phone },
    });
    if (duplicate) return { error: "Já existe cliente com este telefone." };
    await prisma.client.create({
      data: {
        tenantId: session.tenantId,
        name,
        phone,
        email,
        notes,
        tags,
        instagram,
        birthDate,
        source: "balcao",
      },
    });
  }

  revalidatePath("/clientes");
  if (id) revalidatePath(`/clientes/${id}`);
  revalidatePath("/agenda");
  return { ok: true };
}
