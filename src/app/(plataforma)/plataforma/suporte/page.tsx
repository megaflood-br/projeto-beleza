import { requirePlatformAdmin } from "@/lib/tenant";
import { SupportBoard } from "@/components/suporte/support-board";

export default async function PlataformaSuportePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  return <SupportBoard side="PLATFORM" initialTicketId={params.ticket} />;
}
