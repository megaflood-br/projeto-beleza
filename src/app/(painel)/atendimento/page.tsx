import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { InboxBoard } from "@/components/whatsapp/inbox-board";

export default async function AtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const selectedId = typeof params.c === "string" ? params.c : null;
  const [live, conversations] = await Promise.all([
    readWhatsAppLive(session.tenantId),
    prisma.conversation.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Atendimento</h1>
        <p className="text-ink-soft">Conversas do WhatsApp do salão.</p>
      </div>
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
    </div>
  );
}
