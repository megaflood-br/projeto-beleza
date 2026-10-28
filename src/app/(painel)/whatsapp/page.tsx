import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { WhatsAppConnect } from "@/components/whatsapp/whatsapp-connect";
import { CampaignsBoard } from "@/components/whatsapp/campaigns-board";
import { InboxBoard } from "@/components/whatsapp/inbox-board";
import { ensureWhatsAppCampaigns } from "@/lib/ensure-campaigns";
import { runDueCampaigns } from "@/lib/run-due-campaigns";
import { parseWhatsAppTab, WHATSAPP_TABS } from "@/lib/whatsapp-campaigns";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; tab?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const tab = parseWhatsAppTab(params.tab);
  const selectedId = typeof params.c === "string" ? params.c : null;
  const campaigns = await ensureWhatsAppCampaigns(session.tenantId);
  if (tab === "campanhas") {
    void runDueCampaigns(session.tenantId).catch(() => null);
  }

  const [conversations, live] = await Promise.all([
    prisma.conversation.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
    readWhatsAppLive(session.tenantId),
  ]);
  const connected = live.state === "open";
  const current = WHATSAPP_TABS.find((item) => item.id === tab) ?? WHATSAPP_TABS[0];

  return (
    <div className={tab === "inbox" ? "flex h-full min-h-0 flex-col gap-4" : "space-y-4"}>
      <div>
        <h1 className="font-display text-3xl">WhatsApp</h1>
        <p className="text-ink-soft">{current.description}</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {WHATSAPP_TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={item.id === "inbox" ? "/whatsapp" : `/whatsapp?tab=${item.id}`}
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

      {tab === "campanhas" ? (
        <CampaignsBoard
          canManage={canManageTeam(session.role)}
          connected={connected}
          campaigns={campaigns.map((row) => ({
            id: row.id,
            trigger: row.trigger,
            template: row.template,
            active: row.active,
          }))}
        />
      ) : tab === "conexao" ? (
        <div className="max-w-xl">
          <Card>
            <WhatsAppConnect initial={live} />
          </Card>
        </div>
      ) : (
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
      )}
    </div>
  );
}
