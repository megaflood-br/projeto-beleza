"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/tenant";
import { slugify } from "@/lib/utils";
import { TENANT_STATUSES } from "@/lib/constants";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function revalidateSuppliers() {
  revalidatePath("/plataforma");
  revalidatePath("/plataforma/fornecedores");
  revalidatePath("/fornecedores");
}

export async function saveSupplierAccount(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE");
  const phone = text(formData, "phone");
  const email = text(formData, "email")?.toLowerCase() ?? null;
  const city = text(formData, "city");
  const notes = text(formData, "notes");
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "")
    .trim()
    .toLowerCase();
  const ownerPassword = String(formData.get("ownerPassword") ?? "");

  if (!name) return { error: "Informe o nome da empresa." };
  if (!TENANT_STATUSES.includes(status as (typeof TENANT_STATUSES)[number])) return { error: "Status inválido." };

  if (id) {
    const existing = await prisma.tenant.findFirst({ where: { id, kind: "SUPPLIER", isPlatform: false } });
    if (!existing) return { error: "Fornecedor não encontrado." };
    await prisma.tenant.update({
      where: { id },
      data: {
        name,
        status,
        phone,
        email,
        city,
        notes,
        trialEndsAt: status === "TRIAL" ? existing.trialEndsAt ?? addDays(new Date(), 14) : null,
      },
    });
    if (ownerPassword.length >= 6) {
      const owner = await prisma.user.findFirst({
        where: { tenantId: id, role: "SUPPLIER" },
        orderBy: { createdAt: "asc" },
      });
      if (owner) {
        await prisma.user.update({
          where: { id: owner.id },
          data: { passwordHash: await hashPassword(ownerPassword) },
        });
      }
    }
    revalidateSuppliers();
    return { ok: true };
  }

  if (!ownerName || !ownerEmail || ownerPassword.length < 6) {
    return { error: "Informe o responsável, e-mail e senha com 6+ caracteres." };
  }
  const taken = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (taken) return { error: "Já existe um usuário com este e-mail." };

  let slug = slugify(String(formData.get("slug") ?? "") || name) || "fornecedor";
  const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  await prisma.tenant.create({
    data: {
      name,
      slug,
      plan: "fornecedor",
      status,
      phone,
      email: email ?? ownerEmail,
      city,
      notes,
      kind: "SUPPLIER",
      trialEndsAt: status === "TRIAL" ? addDays(new Date(), 14) : null,
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          passwordHash: await hashPassword(ownerPassword),
          role: "SUPPLIER",
        },
      },
    },
  });
  revalidateSuppliers();
  return { ok: true };
}
