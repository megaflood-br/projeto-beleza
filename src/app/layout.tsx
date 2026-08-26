import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MegaBeauty — CRM e agenda para salões de beleza",
  description:
    "Agenda, CRM, estoque, comissões, WhatsApp (Evolution API) e assistente de IA. Multi-tenant em TypeScript.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} min-h-full bg-cream text-ink`}>{children}</body>
    </html>
  );
}
