"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";
import { normalizeCentsPerPoint } from "@/lib/cashback";
import { resolveCityLabel } from "@/lib/br-cities";
import { saveTenantLogo } from "@/lib/product-upload";

function toInt(raw: FormDataEntryValue | null, fallback: number) {
  const value = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function checked(formData: FormData, key: string) {
  return formData.getAll(key).map(String).includes("1");
}

export async function saveSettings(formData: FormData) {
  const { session, tenant } = await requireTenant();
  const logoRaw = String(formData.get("logoUrl") ?? "").trim();
  const logoUrl = await saveTenantLogo(session.tenantId, logoRaw || null, tenant.logoUrl);
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      name: String(formData.get("name") ?? "").trim() || undefined,
      tradeName: String(formData.get("tradeName") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      city: resolveCityLabel(String(formData.get("city") ?? "")) || null,
      openTime: String(formData.get("openTime") ?? "08:00"),
      closeTime: String(formData.get("closeTime") ?? "20:00"),
      reminderHours: Number(formData.get("reminderHours") ?? 24),
      technicalResponsible: String(formData.get("technicalResponsible") ?? "").trim(),
      technicalRegistry: String(formData.get("technicalRegistry") ?? "").trim(),
      logoUrl,
    },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  revalidatePath("/fornecedores");
  revalidatePath("/pops");
  revalidatePath("/pop", "layout");
  return { ok: true };
}

export async function saveCashbackSettings(formData: FormData) {
  const { session } = await requireTenant();
  const earnPct = Math.min(100, Math.max(0, toInt(formData.get("cashbackEarnPct"), 5)));
  const maxRedeemPct = Math.min(100, Math.max(0, toInt(formData.get("cashbackMaxRedeemPct"), 100)));
  const expireDays = Math.max(0, toInt(formData.get("cashbackExpireDays"), 0));
  const centsPerPoint = normalizeCentsPerPoint(parseBRLToCents(String(formData.get("cashbackPointValue") ?? "1")));
  const minSpendCents = Math.max(0, parseBRLToCents(String(formData.get("cashbackMinSpend") ?? "0")));

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      cashbackEnabled: checked(formData, "cashbackEnabled"),
      cashbackEarnPct: earnPct,
      cashbackUseItemPct: checked(formData, "cashbackUseItemPct"),
      cashbackOnServices: checked(formData, "cashbackOnServices"),
      cashbackOnProducts: checked(formData, "cashbackOnProducts"),
      cashbackMinSpendCents: minSpendCents,
      cashbackMaxRedeemPct: maxRedeemPct,
      cashbackExpireDays: expireDays,
      cashbackCentsPerPoint: centsPerPoint,
    },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
  revalidatePath("/comandas");
  return { ok: true };
}
