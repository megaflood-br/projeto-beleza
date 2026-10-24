import { requireTenant } from "@/lib/tenant";
import { SupportBoard } from "@/components/suporte/support-board";

export default async function SuportePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  await requireTenant();
  const params = await searchParams;
  return <SupportBoard side="SALON" initialTicketId={params.ticket} />;
}
