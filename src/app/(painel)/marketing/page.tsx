import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { syncMarketingReplies } from "@/lib/marketing";
import { MARKETING_TABS, parseMarketingTab } from "@/lib/marketing";
import { MarketingBoard } from "@/components/marketing/marketing-board";
import { WhatsAppConnect } from "@/components/whatsapp/whatsapp-connect";
import { CampaignsBoard } from "@/components/whatsapp/campaigns-board";
import { InboxBoard } from "@/components/whatsapp/inbox-board";
import { ensureWhatsAppCampaigns } from "@/lib/ensure-campaigns";
import { runDueCampaigns } from "@/lib/run-due-campaigns";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; tab?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const tab = parseMarketingTab(params.tab);
  const selectedId = typeof params.c === "string" ? params.c : null;
  const current = MARKETING_TABS.find((item) => item.id === tab) ?? MARKETING_TABS[0];
  const live = await readWhatsAppLive(session.tenantId);
  const connected = live.state === "open";

  return (
    <div className={tab === "inbox" ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4"}>
      <div>
        <h1 className="font-display text-3xl">Marketing</h1>
        <p className="text-ink-soft">{current.description}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {MARKETING_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={item.id === "listas" ? "/marketing" : `/marketing?tab=${item.id}`}
              className={cn(
                "-mb-px inline-flex items-center border-b-2 px-4 py-2.5 text-sm",
                active ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === "inbox" ? (
        <InboxPanel tenantId={session.tenantId} selectedId={selectedId} live={live} />
      ) : tab === "campanhas" ? (
        <CampaignsPanel tenantId={session.tenantId} canManage={canManageTeam(session.role)} connected={connected} />
      ) : tab === "conexao" ? (
        <div className="max-w-xl">
          <Card>
            <WhatsAppConnect initial={live} />
          </Card>
        </div>
      ) : (
        <ListsPanel tenantId={session.tenantId} selectedId={selectedId} canManage={canManageTeam(session.role)} connected={connected} />
      )}
    </div>
  );
}

async function ListsPanel({
  tenantId,
  selectedId,
  canManage,
  connected,
}: {
  tenantId: string;
  selectedId: string | null;
  canManage: boolean;
  connected: boolean;
}) {
  await syncMarketingReplies(tenantId, selectedId ?? undefined).catch(() => 0);
  const [campaigns, clients, services] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where: { tenantId },
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
      where: { tenantId, active: true },
      select: { tags: true },
    }),
    prisma.service.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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
      canManage={canManage}
      connected={connected}
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

async function InboxPanel({
  tenantId,
  selectedId,
  live,
}: {
  tenantId: string;
  selectedId: string | null;
  live: Awaited<ReturnType<typeof readWhatsAppLive>>;
}) {
  const conversations = await prisma.conversation.findMany({
    where: { tenantId },
    include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { lastMessageAt: "desc" },
  });
  return (
    <InboxBoard
      live={live}
      selectedId={selectedId}
      conversations={conversations.map((conversation) => ({
        id: conversation.id,
        phone: conversation.phone,
        client: conversation.client ? { name: conversation.client.name } : null,
        messages: conversation.messages,
      }))}
    />
  );
}

async function CampaignsPanel({
  tenantId,
  canManage,
  connected,
}: {
  tenantId: string;
  canManage: boolean;
  connected: boolean;
}) {
  const campaigns = await ensureWhatsAppCampaigns(tenantId);
  void runDueCampaigns(tenantId).catch(() => null);
  return (
    <CampaignsBoard
      canManage={canManage}
      connected={connected}
      campaigns={campaigns.map((row) => ({
        id: row.id,
        trigger: row.trigger,
        template: row.template,
        active: row.active,
      }))}
    />
  );
}
