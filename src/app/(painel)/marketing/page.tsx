import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { syncMarketingReplies } from "@/lib/marketing";
import { MarketingBoard } from "@/components/marketing/marketing-board";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const selectedId = typeof params.c === "string" ? params.c : null;

  await syncMarketingReplies(session.tenantId, selectedId ?? undefined).catch(() => 0);

  const [campaigns, clients, services, live] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where: { tenantId: session.tenantId },
      include: {
        recipients: {
          include: { client: { select: { name: true } } },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.client.findMany({
      where: { tenantId: session.tenantId, active: true },
      select: { tags: true },
    }),
    prisma.service.findMany({
      where: { tenantId: session.tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    readWhatsAppLive(session.tenantId),
  ]);

  const tags = [
    ...new Set(
      clients.flatMap((client) =>
        client.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <MarketingBoard
      canManage={canManageTeam(session.role)}
      connected={live.state === "open"}
      selectedId={selectedId}
      tags={tags}
      services={services}
      campaigns={campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        body: campaign.body,
        audience: campaign.audience,
        tag: campaign.tag,
        serviceId: campaign.serviceId,
        inactiveDays: campaign.inactiveDays,
        status: campaign.status,
        createdAt: campaign.createdAt.toISOString(),
        sentAt: campaign.sentAt?.toISOString() ?? null,
        recipients: campaign.recipients.map((row) => ({
          id: row.id,
          clientId: row.clientId,
          clientName: row.client.name,
          phone: row.phone,
          status: row.status,
          error: row.error,
          sentAt: row.sentAt?.toISOString() ?? null,
          repliedAt: row.repliedAt?.toISOString() ?? null,
          replyPreview: row.replyPreview,
          conversationId: row.conversationId,
        })),
      }))}
    />
  );
}
