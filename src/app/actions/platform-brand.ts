"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { parseHexColor, SYSTEM_LOGO, SYSTEM_PRIMARY } from "@/lib/branding";
import { saveTenantLogo } from "@/lib/product-upload";

export async function savePlatformBrand(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  const primary = parseHexColor(String(formData.get("accentColor") ?? ""), SYSTEM_PRIMARY);
  const logoRaw = String(formData.get("logoUrl") ?? "").trim();
  const logoUrl = (await saveTenantLogo(tenant.id, logoRaw || SYSTEM_LOGO, tenant.logoUrl)) || SYSTEM_LOGO;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { accentColor: primary, logoUrl },
  });
  revalidatePath("/", "layout");
  revalidatePath("/plataforma/aparencia");
  revalidatePath("/login");
  revalidatePath("/cadastro");
  return { ok: true as const };
}
