import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MegaBeauty — CRM e agenda para salões de beleza",
  description:
    "Sistema para salões de beleza: agenda, comandas, comissões, estoque e WhatsApp. Menos planilha, mais faturamento.",
  applicationName: "MegaBeauty",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MegaBeauty",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} min-h-full bg-cream text-ink`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
