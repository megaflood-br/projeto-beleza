import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { Button, Card, Textarea } from "@/components/ui";
import { sendWhatsApp } from "@/app/actions/whatsapp";
import { formatTime } from "@/lib/dates";
import { cn, formAction } from "@/lib/utils";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { WhatsAppConnect } from "@/components/whatsapp/whatsapp-connect";
import { CampaignsBoard } from "@/components/whatsapp/campaigns-board";
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
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const connected = live.state === "open";
  const current = WHATSAPP_TABS.find((item) => item.id === tab) ?? WHATSAPP_TABS[0];

  return (
    <div className="space-y-4">
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
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
          <Card className="p-0">
            {conversations.length ? (
              conversations.map((c) => (
                <a
                  key={c.id}
                  href={`/whatsapp?c=${c.id}`}
                  className={`block border-b border-line px-4 py-3 ${selected?.id === c.id ? "bg-sand" : ""}`}
                >
                  <div className="font-medium">{c.client?.name ?? c.phone}</div>
                  <div className="truncate text-xs text-ink-soft">{c.messages.at(-1)?.body}</div>
                </a>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-ink-soft">Nenhuma conversa ainda.</p>
            )}
          </Card>
          <Card className="flex min-h-[480px] flex-col">
            <div className="mb-3 font-medium">{selected?.client?.name ?? selected?.phone ?? "Selecione uma conversa"}</div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {selected?.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.direction === "OUT" ? "ml-auto bg-wine text-white" : "bg-sand"}`}
                >
                  <div>{m.body}</div>
                  <div className="mt-1 text-[10px] opacity-70">{formatTime(m.createdAt)}</div>
                </div>
              ))}
            </div>
            {selected ? (
              <form action={formAction(sendWhatsApp)} className="mt-3 grid gap-2">
                <input type="hidden" name="conversationId" value={selected.id} />
                <input type="hidden" name="phone" value={selected.phone} />
                <Textarea name="body" placeholder="Escreva uma mensagem..." required />
                <Button>Enviar</Button>
              </form>
            ) : null}
          </Card>
          <Card>
            <WhatsAppConnect initial={live} />
          </Card>
        </div>
      )}
    </div>
  );
}
