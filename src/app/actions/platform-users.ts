"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { isValidUserEmail, wouldRemoveLastPlatformAdmin } from "@/lib/users";

function revalidateHqUsers() {
  revalidatePath("/plataforma/usuarios");
}

async function adminCount(tenantId: string) {
  return prisma.user.count({ where: { tenantId, role: "SUPER_ADMIN", active: true } });
}

export async function savePlatformUser(formData: FormData) {
  const { session, tenant } = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "1";

  if (!name) return { error: "Informe o nome." };
  if (!isValidUserEmail(email)) return { error: "Informe um e-mail válido." };

  if (id) {
    const existing = await prisma.user.findFirst({
      where: { id, tenantId: tenant.id, role: "SUPER_ADMIN" },
    });
    if (!existing) return { error: "Administrador não encontrado." };
    if (existing.id === session.userId && !active) return { error: "Você não pode desativar o próprio acesso." };
    if (
      wouldRemoveLastPlatformAdmin({
        currentRole: existing.role,
        nextActive: active,
        adminCount: await adminCount(tenant.id),
      })
    ) {
      return { error: "A plataforma precisa de pelo menos um administrador ativo." };
    }
    const emailTaken = await prisma.user.findFirst({ where: { email, id: { not: id } } });
    if (emailTaken) return { error: "E-mail já cadastrado." };
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        active,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } else {
    if (password.length < 6) return { error: "A senha precisa ter 6+ caracteres." };
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return { error: "E-mail já cadastrado." };
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        role: "SUPER_ADMIN",
        active,
        passwordHash: await hashPassword(password),
      },
    });
  }

  revalidateHqUsers();
  return { ok: true as const };
}

export async function setPlatformUserActive(formData: FormData) {
  const { session, tenant } = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  const existing = await prisma.user.findFirst({
    where: { id, tenantId: tenant.id, role: "SUPER_ADMIN" },
  });
  if (!existing) return { error: "Administrador não encontrado." };
  if (existing.id === session.userId) return { error: "Você não pode desativar o próprio acesso." };
  if (
    wouldRemoveLastPlatformAdmin({
      currentRole: existing.role,
      nextActive: active,
      adminCount: await adminCount(tenant.id),
    })
  ) {
    return { error: "A plataforma precisa de pelo menos um administrador ativo." };
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidateHqUsers();
  return { ok: true as const };
}
