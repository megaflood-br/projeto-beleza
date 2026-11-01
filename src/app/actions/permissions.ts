"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import {
  canManagePermissions,
  parseStoredAccess,
  serializeAccess,
  type StoredAccess,
} from "@/lib/permissions";

function revalidateAccess() {
  revalidatePath("/permissoes");
  revalidatePath("/usuarios");
  revalidatePath("/agenda");
  revalidatePath("/", "layout");
}

function readStored(formData: FormData): StoredAccess {
  const admin = String(formData.get("admin") ?? "") === "1";
  const raw = String(formData.get("grants") ?? "");
  const parsed = parseStoredAccess(raw || "{}");
  return {
    admin,
    modules: admin ? parsed.modules : parsed.modules,
  };
}

export async function savePermissionProfile(formData: FormData) {
  const { session, access } = await requireTenant();
  if (!canManagePermissions(session.role, access)) return { error: "Sem permissão para alterar perfis." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do perfil." };
  const stored = readStored(formData);
  const grants = serializeAccess({ admin: false, modules: stored.modules });

  if (id) {
    const existing = await prisma.permissionProfile.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) return { error: "Perfil não encontrado." };
    await prisma.permissionProfile.update({
      where: { id },
      data: { name, isAdmin: stored.admin === true, grants },
    });
  } else {
    await prisma.permissionProfile.create({
      data: {
        tenantId: session.tenantId,
        name,
        isAdmin: stored.admin === true,
        grants,
      },
    });
  }
  revalidateAccess();
  return { ok: true as const };
}

export async function deletePermissionProfile(formData: FormData) {
  const { session, access } = await requireTenant();
  if (!canManagePermissions(session.role, access)) return { error: "Sem permissão para excluir perfis." };
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.permissionProfile.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) return { error: "Perfil não encontrado." };
  await prisma.user.updateMany({
    where: { tenantId: session.tenantId, permissionProfileId: id },
    data: { permissionProfileId: null },
  });
  await prisma.permissionProfile.delete({ where: { id } });
  revalidateAccess();
  return { ok: true as const };
}

export async function saveUserAccess(formData: FormData) {
  const { session, access } = await requireTenant();
  if (!canManagePermissions(session.role, access)) return { error: "Sem permissão para alterar acessos." };

  const userId = String(formData.get("userId") ?? "");
  const mode = String(formData.get("mode") ?? "role");
  const profileId = String(formData.get("profileId") ?? "") || null;
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId: session.tenantId, role: { not: "SUPER_ADMIN" } },
  });
  if (!user) return { error: "Usuário não encontrado." };
  if (user.id === session.userId && user.role === "OWNER") {
    const stored = readStored(formData);
    if (mode === "custom" && !stored.admin && user.role === "OWNER") {
      // owner may customize, but keep them able to manage users
    }
  }

  if (mode === "profile") {
    if (profileId) {
      const profile = await prisma.permissionProfile.findFirst({
        where: { id: profileId, tenantId: session.tenantId },
      });
      if (!profile) return { error: "Perfil não encontrado." };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { permissionProfileId: profileId, accessJson: null },
    });
  } else if (mode === "custom") {
    const stored = readStored(formData);
    await prisma.user.update({
      where: { id: user.id },
      data: { permissionProfileId: null, accessJson: serializeAccess(stored) },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { permissionProfileId: null, accessJson: null },
    });
  }

  revalidateAccess();
  return { ok: true as const };
}

