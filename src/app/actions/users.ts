"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam, hashPassword } from "@/lib/auth";
import { type Role } from "@/lib/constants";
import {
  canAssignTenantRole,
  canEditTenantUser,
  isValidUserEmail,
  parseTenantRole,
  wouldRemoveLastOwner,
} from "@/lib/users";

function revalidateUsers() {
  revalidatePath("/usuarios");
  revalidatePath("/equipe");
}

async function ownerCount(tenantId: string) {
  return prisma.user.count({ where: { tenantId, role: "OWNER", active: true } });
}

export async function saveTenantUser(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseTenantRole(String(formData.get("role") ?? ""));
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const password = String(formData.get("password") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "1";

  if (!name) return { error: "Informe o nome." };
  if (!isValidUserEmail(email)) return { error: "Informe um e-mail válido." };
  if (!role) return { error: "Perfil inválido." };
  if (!canAssignTenantRole(session.role as Role, role)) return { error: "Você não pode atribuir este perfil." };

  if (professionalId) {
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: session.tenantId },
    });
    if (!professional) return { error: "Profissional não encontrado." };
    const taken = await prisma.user.findFirst({
      where: { professionalId, id: id ? { not: id } : undefined },
    });
    if (taken) return { error: "Este profissional já tem um usuário." };
  }

  if (id) {
    const existing = await prisma.user.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Usuário não encontrado." };
    if (!canEditTenantUser({ role: session.role, userId: session.userId }, existing)) {
      return { error: "Sem permissão para editar este usuário." };
    }
    if (
      wouldRemoveLastOwner({
        currentRole: existing.role,
        nextRole: role,
        nextActive: active,
        ownerCount: await ownerCount(session.tenantId),
      })
    ) {
      return { error: "O salão precisa de pelo menos um proprietário ativo." };
    }
    if (existing.id === session.userId && !active) return { error: "Você não pode desativar o próprio acesso." };

    const emailTaken = await prisma.user.findFirst({ where: { email, id: { not: id } } });
    if (emailTaken) return { error: "E-mail já cadastrado." };

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        active,
        professionalId,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } else {
    if (password.length < 6) return { error: "A senha precisa ter 6+ caracteres." };
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return { error: "E-mail já cadastrado." };
    await prisma.user.create({
      data: {
        tenantId: session.tenantId,
        name,
        email,
        role,
        active,
        professionalId,
        passwordHash: await hashPassword(password),
      },
    });
  }

  revalidateUsers();
  return { ok: true as const };
}

export async function setTenantUserActive(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  const existing = await prisma.user.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return { error: "Usuário não encontrado." };
  if (!canEditTenantUser({ role: session.role, userId: session.userId }, existing)) {
    return { error: "Sem permissão para editar este usuário." };
  }
  if (existing.id === session.userId) return { error: "Você não pode desativar o próprio acesso." };
  if (
    wouldRemoveLastOwner({
      currentRole: existing.role,
      nextActive: active,
      ownerCount: await ownerCount(session.tenantId),
    })
  ) {
    return { error: "O salão precisa de pelo menos um proprietário ativo." };
  }
  await prisma.user.update({ where: { id }, data: { active } });
  revalidateUsers();
  return { ok: true as const };
}
