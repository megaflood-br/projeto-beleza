"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePartner } from "@/lib/tenant";
import { parseHexColor, SYSTEM_PRIMARY } from "@/lib/branding";
import { saveTenantLogo } from "@/lib/product-upload";
import { isPixKeyType } from "@/lib/partners";

export async function savePartnerBrand(formData: FormData) {
  const { partner, tenant } = await requirePartner();
  const name = String(formData.get("name") ?? "").trim();
  const primary = parseHexColor(String(formData.get("primary") ?? ""), SYSTEM_PRIMARY);
  const secondary = parseHexColor(String(formData.get("secondary") ?? ""), "#0f172a");
  const logoRaw = String(formData.get("logoUrl") ?? "").trim();
  const faviconRaw = String(formData.get("faviconUrl") ?? "").trim();
  if (!name) return { error: "Informe o nome da marca do sistema." };

  const previous = partner.brand;
  const logoUrl = logoRaw ? await saveTenantLogo(tenant.id, logoRaw, previous?.logoUrl) : previous?.logoUrl ?? null;
  const faviconUrl = faviconRaw
    ? await saveTenantLogo(`${tenant.id}-favicon`, faviconRaw, previous?.faviconUrl)
    : previous?.faviconUrl ?? null;

  await prisma.partnerBrand.upsert({
    where: { partnerId: partner.id },
    create: { partnerId: partner.id, name, primary, secondary, logoUrl, faviconUrl },
    update: { name, primary, secondary, logoUrl, faviconUrl },
  });
  revalidatePath("/parceiro/aparencia");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function savePartnerPayoutInfo(formData: FormData) {
  const { partner } = await requirePartner();
  const pixKey = String(formData.get("pixKey") ?? "").trim() || null;
  const pixKeyTypeRaw = String(formData.get("pixKeyType") ?? "").trim();
  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      pixKey,
      pixKeyType: isPixKeyType(pixKeyTypeRaw) ? pixKeyTypeRaw : partner.pixKeyType,
      bankName: String(formData.get("bankName") ?? "").trim() || null,
      bankAgency: String(formData.get("bankAgency") ?? "").trim() || null,
      bankAccount: String(formData.get("bankAccount") ?? "").trim() || null,
    },
  });
  revalidatePath("/parceiro/financeiro");
  return { ok: true as const };
}
