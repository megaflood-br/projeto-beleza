import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { BrandingProvider } from "@/components/branding-provider";
import { brandCssVars, SYSTEM_BRAND_NAME, SYSTEM_PRIMARY } from "@/lib/branding";
import { loadSystemBrand } from "@/lib/load-system-brand";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadSystemBrand();
  const title = `${brand.name} — CRM e agenda para salões de beleza`;
  return {
    title,
    description:
      "Sistema para salões de beleza: agenda, comandas, comissões, estoque e WhatsApp. Menos planilha, mais faturamento.",
    applicationName: brand.name || SYSTEM_BRAND_NAME,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: brand.name || SYSTEM_BRAND_NAME,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [{ url: brand.faviconUrl || "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: brand.faviconUrl || "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await loadSystemBrand();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: brand.primary || SYSTEM_PRIMARY,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await loadSystemBrand();
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} min-h-full bg-cream text-ink`}>
        <style>{`:root{${brandCssVars(brand)}}`}</style>
        <BrandingProvider brand={brand}>
          {children}
          <PwaRegister />
        </BrandingProvider>
      </body>
    </html>
  );
}
