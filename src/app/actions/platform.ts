"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { hashPassword, homePath, setSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin, requireSession } from "@/lib/tenant";
import { slugify } from "@/lib/utils";
import { ensureFinanceCatalog } from "@/lib/finance-catalog";
import { ensureAnamnesisForms } from "@/lib/anamnesis";
import { TENANT_STATUSES, type Role } from "@/lib/constants";
import { listPlatformPlans } from "@/lib/plans";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function revalidatePlatform() {
  revalidatePath("/plataforma");
  revalidatePath("/plataforma/fornecedores");
  revalidatePath("/dashboard");
  revalidatePath("/fornecedores");
}

export async function saveTenantAccount(formData: FormData) {
  const { session } = await requirePlatformAdmin();
  void session;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const plan = String(formData.get("plan") ?? "profissional");
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

  if (!name) return { error: "Informe o nome do salão." };
  const catalog = await listPlatformPlans();
  const selectedPlan = catalog.find((item) => item.slug === plan);
  if (!selectedPlan) return { error: "Plano inválido. Cadastre o tipo em Planos." };
  if (!selectedPlan.active && !id) return { error: "Este plano está inativo." };
  if (!TENANT_STATUSES.includes(status as (typeof TENANT_STATUSES)[number])) return { error: "Status inválido." };

  if (id) {
    const existing = await prisma.tenant.findFirst({ where: { id, isPlatform: false } });
    if (!existing) return { error: "Conta não encontrada." };
    await prisma.tenant.update({
      where: { id },
      data: {
        name,
        plan,
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
        where: { tenantId: id, role: "OWNER" },
        orderBy: { createdAt: "asc" },
      });
      if (owner) {
        await prisma.user.update({
          where: { id: owner.id },
          data: { passwordHash: await hashPassword(ownerPassword) },
        });
      }
    }
    revalidatePlatform();
    return { ok: true };
  }

  if (!ownerName || !ownerEmail || ownerPassword.length < 6) {
    return { error: "Para criar a conta, informe o dono, e-mail e senha com 6+ caracteres." };
  }
  const taken = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (taken) return { error: "Já existe um usuário com este e-mail." };

  let slug = slugify(String(formData.get("slug") ?? "") || name) || "salao";
  const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      plan,
      status,
      phone,
      email: email ?? ownerEmail,
      city,
      notes,
      trialEndsAt: status === "TRIAL" ? addDays(new Date(), 14) : null,
      kind: "SALON",
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          passwordHash: await hashPassword(ownerPassword),
          role: "OWNER",
        },
      },
      categories: {
        create: [{ name: "Cabelo" }, { name: "Estética" }, { name: "Unhas" }, { name: "Barba" }],
      },
    },
  });
  await ensureFinanceCatalog(tenant.id);
  await ensureAnamnesisForms(tenant.id);
  revalidatePlatform();
  return { ok: true, id: tenant.id };
}

export async function setTenantStatus(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!TENANT_STATUSES.includes(status as (typeof TENANT_STATUSES)[number])) {
    return { error: "Status inválido." };
  }
  const tenant = await prisma.tenant.findFirst({ where: { id, isPlatform: false } });
  if (!tenant) return { error: "Conta não encontrada." };
  await prisma.tenant.update({
    where: { id },
    data: {
      status,
      trialEndsAt: status === "TRIAL" ? tenant.trialEndsAt ?? addDays(new Date(), 14) : null,
    },
  });
  revalidatePlatform();
  return { ok: true };
}

export async function impersonateTenant(formData: FormData) {
  const { session } = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const tenant = await prisma.tenant.findFirst({
    where: { id, isPlatform: false },
    include: { users: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const owner =
    tenant?.users[0] ??
    (await prisma.user.findFirst({
      where: { tenantId: id, active: true },
      orderBy: { createdAt: "asc" },
    }));
  if (!tenant || !owner) return { error: "Não há um usuário ativo nesta conta." };

  await setSessionCookie({
    userId: owner.id,
    tenantId: tenant.id,
    email: owner.email,
    name: owner.name,
    role: owner.role as Role,
    impersonatorId: session.userId,
    impersonatorName: session.name,
  });
  redirect(homePath(owner.role, tenant.kind));
}

export async function stopImpersonation() {
  const session = await requireSession();
  if (!session.impersonatorId) redirect("/plataforma");
  const admin = await prisma.user.findUnique({ where: { id: session.impersonatorId } });
  if (!admin || admin.role !== "SUPER_ADMIN" || !admin.active) {
    redirect("/login");
  }
  await setSessionCookie({
    userId: admin.id,
    tenantId: admin.tenantId,
    email: admin.email,
    name: admin.name,
    role: "SUPER_ADMIN",
  });
  redirect("/plataforma");
}

export async function deleteTenantAccount(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const tenant = await prisma.tenant.findFirst({ where: { id, isPlatform: false } });
  if (!tenant) return { error: "Conta não encontrada." };
  await prisma.tenant.delete({ where: { id } });
  revalidatePlatform();
  return { ok: true };
}
