import { redirect } from "next/navigation";
import { parseWhatsAppTab } from "@/lib/whatsapp-campaigns";
import { atendimentoPath, marketingPath } from "@/lib/marketing";

export default async function WhatsAppRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const tab = parseWhatsAppTab(params.tab);
  if (tab === "inbox") redirect(atendimentoPath(params.c));
  redirect(marketingPath(tab, params.c));
}
