"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { parseHexColor, SYSTEM_LOGO, SYSTEM_LOGO_DARK, SYSTEM_PRIMARY } from "@/lib/branding";
import { saveTenantLogo } from "@/lib/product-upload";
import { serializeLandingFeatures } from "@/lib/partners";

export async function savePlatformBrand(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  const primary = parseHexColor(String(formData.get("accentColor") ?? ""), SYSTEM_PRIMARY);
  const logoRaw = String(formData.get("logoUrl") ?? "").trim();
  const logoDarkRaw = String(formData.get("logoDarkUrl") ?? "").trim();
  const faviconRaw = String(formData.get("faviconUrl") ?? "").trim();
  const logoUrl = (await saveTenantLogo(tenant.id, logoRaw || SYSTEM_LOGO, tenant.logoUrl)) || SYSTEM_LOGO;
  const logoDarkUrl =
    (await saveTenantLogo(`${tenant.id}-dark`, logoDarkRaw || SYSTEM_LOGO_DARK, tenant.logoDarkUrl)) || SYSTEM_LOGO_DARK;
  const faviconUrl = await saveTenantLogo(`${tenant.id}-favicon`, faviconRaw || null, tenant.faviconUrl);
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { accentColor: primary, logoUrl, logoDarkUrl, faviconUrl },
  });
  revalidatePath("/", "layout");
  revalidatePath("/plataforma/aparencia");
  revalidatePath("/login");
  revalidatePath("/cadastro");
  return { ok: true as const };
}

export async function savePlatformLanding(formData: FormData) {
  const { tenant } = await requirePlatformAdmin();
  const kicker = String(formData.get("kicker") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const cta = String(formData.get("cta") ?? "").trim();
  const imageRaw = String(formData.get("imageUrl") ?? "").trim();
  const features = [1, 2, 3, 4, 5, 6].map((index) => ({
    title: String(formData.get(`featureTitle${index}`) ?? "").trim(),
    text: String(formData.get(`featureText${index}`) ?? "").trim(),
  }));
  const landingImageUrl = imageRaw
    ? await saveTenantLogo(`${tenant.id}-landing`, imageRaw, tenant.landingImageUrl)
    : tenant.landingImageUrl ?? null;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      landingKicker: kicker,
      landingHeadline: headline,
      landingText: text,
      landingCta: cta,
      landingImageUrl,
      landingFeatures: serializeLandingFeatures(features),
    },
  });
  revalidatePath("/plataforma/aparencia");
  revalidatePath("/");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
