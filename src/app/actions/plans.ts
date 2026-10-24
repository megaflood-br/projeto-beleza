"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { featuresFromText, nextPlanSlug, PLAN_INTERVALS } from "@/lib/plans";

function revalidatePlans() {
  revalidatePath("/plataforma");
  revalidatePath("/plataforma/planos");
  revalidatePath("/dashboard");
}

function flag(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") === "1";
}

function toInt(raw: FormDataEntryValue | null, fallback: number) {
  const value = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

export async function savePlatformPlan(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const interval = String(formData.get("interval") ?? "monthly");
  const priceCents = Math.max(0, parseBRLToCents(String(formData.get("price") ?? "0")));
  const trialDays = Math.max(0, toInt(formData.get("trialDays"), 14));
  const features = featuresFromText(String(formData.get("features") ?? ""));
  const active = formData.getAll("active").map(String).at(-1) !== "0";
  const highlighted = flag(formData, "highlighted");
  const isDefault = flag(formData, "isDefault");

  if (!name) return { error: "Informe o nome do plano." };
  if (!PLAN_INTERVALS.includes(interval as (typeof PLAN_INTERVALS)[number])) {
    return { error: "Periodicidade inválida." };
  }

  const others = await prisma.platformPlan.findMany({
    where: id ? { id: { not: id } } : undefined,
    select: { slug: true },
  });
  const requestedSlug = slugify(String(formData.get("slug") ?? "") || name);
  const slug = requestedSlug && !others.some((row) => row.slug === requestedSlug)
    ? requestedSlug
    : nextPlanSlug(name, others.map((row) => row.slug));

  if (isDefault) {
    await prisma.platformPlan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  if (id) {
    const existing = await prisma.platformPlan.findUnique({ where: { id } });
    if (!existing) return { error: "Plano não encontrado." };
    await prisma.platformPlan.update({
      where: { id },
      data: {
        name,
        slug: existing.slug,
        description,
        priceCents,
        interval,
        trialDays,
        features,
        active,
        highlighted,
        isDefault: isDefault || existing.isDefault,
      },
    });
  } else {
    const last = await prisma.platformPlan.findFirst({ orderBy: { sortOrder: "desc" } });
    await prisma.platformPlan.create({
      data: {
        name,
        slug,
        description,
        priceCents,
        interval,
        trialDays,
        features,
        active,
        highlighted,
        isDefault,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  revalidatePlans();
  return { ok: true as const };
}

export async function deletePlatformPlan(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const plan = await prisma.platformPlan.findUnique({ where: { id } });
  if (!plan) return { error: "Plano não encontrado." };
  const inUse = await prisma.tenant.count({ where: { plan: plan.slug, isPlatform: false } });
  if (inUse) return { error: `Este plano está em ${inUse} conta(s). Desative em vez de excluir.` };
  const remaining = await prisma.platformPlan.count({ where: { id: { not: id } } });
  if (!remaining) return { error: "Mantenha pelo menos um tipo de plano." };
  if (plan.isDefault) {
    const next = await prisma.platformPlan.findFirst({
      where: { id: { not: id }, active: true },
      orderBy: { sortOrder: "asc" },
    });
    if (next) await prisma.platformPlan.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  await prisma.platformPlan.delete({ where: { id } });
  revalidatePlans();
  return { ok: true as const };
}

export async function setPlatformPlanActive(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  const plan = await prisma.platformPlan.findUnique({ where: { id } });
  if (!plan) return { error: "Plano não encontrado." };
  if (!active && plan.isDefault) return { error: "Não desative o plano padrão. Escolha outro padrão primeiro." };
  await prisma.platformPlan.update({ where: { id }, data: { active } });
  revalidatePlans();
  return { ok: true as const };
}
