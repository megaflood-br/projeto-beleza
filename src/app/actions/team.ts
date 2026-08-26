"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam, hashPassword } from "@/lib/auth";
import type { Role } from "@/lib/constants";

export async function upsertProfessional(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "") || null;
  const color = String(formData.get("color") ?? "#2563EB");
  const commissionPct = Number(formData.get("commissionPct") ?? 40);
  const phone = String(formData.get("phone") ?? "") || null;
  const workStart = String(formData.get("workStart") ?? "09:00");
  const workEnd = String(formData.get("workEnd") ?? "19:00");

  if (!name) return { error: "Nome é obrigatório." };

  if (id) {
    await prisma.professional.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { name, specialty, color, commissionPct, phone, workStart, workEnd },
    });
  } else {
    await prisma.professional.create({
      data: {
        tenantId: session.tenantId,
        name,
        specialty,
        color,
        commissionPct,
        phone,
        workStart,
        workEnd,
      },
    });
  }
  revalidatePath("/equipe");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function inviteTeamUser(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "RECEPTIONIST") as Role;
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const password = String(formData.get("password") ?? "demo1234");

  if (!name || !email) return { error: "Nome e e-mail são obrigatórios." };
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "E-mail já cadastrado." };

  await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      name,
      email,
      role,
      professionalId,
      passwordHash: await hashPassword(password),
    },
  });
  revalidatePath("/equipe");
  return { ok: true };
}
