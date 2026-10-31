import { requirePlatformAdmin } from "@/lib/tenant";
import { AppearanceBoard } from "@/components/plataforma/appearance-board";
import { loadSystemBrand } from "@/lib/branding";

export default async function PlataformaAparenciaPage() {
  await requirePlatformAdmin();
  const brand = await loadSystemBrand();
  return <AppearanceBoard logoUrl={brand.logoUrl} primary={brand.primary} />;
}
