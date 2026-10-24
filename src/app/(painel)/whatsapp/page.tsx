import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card, Textarea } from "@/components/ui";
import { sendWhatsApp } from "@/app/actions/whatsapp";
import { formatTime } from "@/lib/dates";
import { formAction } from "@/lib/utils";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { WhatsAppConnect } from "@/components/whatsapp/whatsapp-connect";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const selectedId = typeof params.c === "string" ? params.c : null;

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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">WhatsApp</h1>
          <p className="text-ink-soft">
            Inbox do salão. {connected ? "WhatsApp vinculado." : "Vincule o número pelo QR Code ao lado."}
          </p>
        </div>
      </div>
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
    </div>
  );
}
