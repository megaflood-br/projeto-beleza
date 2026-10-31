"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/tenant";
import { slugify } from "@/lib/utils";
import { parseHexColor, SYSTEM_PRIMARY } from "@/lib/branding";
import {
  isPartnerStatus,
  isPixKeyType,
  parseCommissionPercent,
  sanitizePartnerSlug,
} from "@/lib/partners";

function revalidatePartners() {
  revalidatePath("/plataforma/parceiros");
  revalidatePath("/plataforma/comissoes");
  revalidatePath("/plataforma/canais");
  revalidatePath("/", "layout");
}

export async function savePartnerAccount(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "")
    .trim()
    .toLowerCase();
  const ownerPassword = String(formData.get("ownerPassword") ?? "");
  const status = String(formData.get("status") ?? "PENDING");
  const slug = sanitizePartnerSlug(String(formData.get("slug") ?? "") || name);
  const commissionBps = parseCommissionPercent(String(formData.get("commissionPercent") ?? ""));
  const pixKey = String(formData.get("pixKey") ?? "").trim() || null;
  const pixKeyTypeRaw = String(formData.get("pixKeyType") ?? "").trim();
  const pixKeyType = isPixKeyType(pixKeyTypeRaw) ? pixKeyTypeRaw : null;
  const brandName = String(formData.get("brandName") ?? "").trim() || name;
  const primary = parseHexColor(String(formData.get("primary") ?? ""), SYSTEM_PRIMARY);

  if (!name) return { error: "Informe o nome do parceiro." };
  if (!slug) return { error: "Informe um slug válido para o link." };
  if (!isPartnerStatus(status)) return { error: "Status inválido." };

  if (id) {
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) return { error: "Parceiro não encontrado." };
    const slugTaken = await prisma.partner.findFirst({ where: { slug, id: { not: id } } });
    if (slugTaken) return { error: "Este slug já está em uso." };
    await prisma.partner.update({
      where: { id },
      data: {
        slug,
        status,
        commissionBps,
        pixKey,
        pixKeyType,
      },
    });
    await prisma.partnerBrand.upsert({
      where: { partnerId: id },
      create: { partnerId: id, name: brandName, primary },
      update: { name: brandName, primary },
    });
    await prisma.tenant.update({
      where: { id: existing.tenantId },
      data: { name, status: status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE" },
    });
    if (ownerPassword.length >= 6) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { passwordHash: await hashPassword(ownerPassword) },
      });
    }
    revalidatePartners();
    return { ok: true as const };
  }

  if (!ownerName || !ownerEmail || ownerPassword.length < 6) {
    return { error: "Informe o responsável, e-mail e senha com 6+ caracteres." };
  }
  const emailTaken = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (emailTaken) return { error: "Já existe um usuário com este e-mail." };
  const slugTaken = await prisma.partner.findUnique({ where: { slug } });
  if (slugTaken) return { error: "Este slug já está em uso." };

  let tenantSlug = slugify(`parceiro-${slug}`) || "parceiro";
  if (await prisma.tenant.findUnique({ where: { slug: tenantSlug } })) {
    tenantSlug = `${tenantSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug: tenantSlug,
      email: ownerEmail,
      plan: "parceiro",
      status: status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      kind: "PARTNER",
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          passwordHash: await hashPassword(ownerPassword),
          role: "PARTNER",
        },
      },
    },
    include: { users: true },
  });
  const user = tenant.users[0];
  await prisma.partner.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      slug,
      commissionBps,
      status,
      pixKey,
      pixKeyType,
      brand: {
        create: {
          name: brandName,
          primary,
        },
      },
    },
  });
  revalidatePartners();
  return { ok: true as const };
}

export async function setPartnerStatus(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isPartnerStatus(status)) return { error: "Status inválido." };
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) return { error: "Parceiro não encontrado." };
  await prisma.partner.update({ where: { id }, data: { status } });
  await prisma.tenant.update({
    where: { id: partner.tenantId },
    data: { status: status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE" },
  });
  revalidatePartners();
  return { ok: true as const };
}
