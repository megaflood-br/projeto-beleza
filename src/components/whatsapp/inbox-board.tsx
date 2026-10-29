import { Button, Card, Textarea } from "@/components/ui";
import { sendWhatsApp } from "@/app/actions/whatsapp";
import { formatTime } from "@/lib/dates";
import { formAction, formatPhoneBR } from "@/lib/utils";
import { WhatsAppConnect } from "@/components/whatsapp/whatsapp-connect";
import type { WhatsAppLive } from "@/lib/whatsapp-live";

type InboxConversation = {
  id: string;
  phone: string;
  client: { name: string } | null;
  messages: { id: string; direction: string; body: string; createdAt: Date }[];
};

export function InboxBoard({
  conversations,
  selectedId,
  live,
}: {
  conversations: InboxConversation[];
  selectedId: string | null;
  live: WhatsAppLive;
}) {
  const selected = conversations.find((row) => row.id === selectedId) ?? conversations[0];

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)_minmax(16rem,20rem)]">
      <Card className="flex max-h-56 min-h-0 flex-col overflow-hidden p-0 lg:max-h-none">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length ? (
            conversations.map((conversation) => (
              <a
                key={conversation.id}
                href={`/atendimento?c=${conversation.id}`}
                className={`block border-b border-line px-4 py-3 ${selected?.id === conversation.id ? "bg-sand" : ""}`}
              >
                <div className="truncate font-medium">{conversation.client?.name ?? formatPhoneBR(conversation.phone)}</div>
                <div className="truncate text-xs text-ink-soft">{conversation.messages.at(-1)?.body}</div>
              </a>
            ))
          ) : (
            <p className="px-4 py-10 text-center text-sm text-ink-soft">Nenhuma conversa ainda.</p>
          )}
        </div>
      </Card>

      <Card className="flex min-h-[22rem] min-w-0 flex-col overflow-hidden p-0 lg:min-h-0">
        <div className="shrink-0 truncate border-b border-line px-5 py-3 font-medium">
          {selected?.client?.name ?? (selected ? formatPhoneBR(selected.phone) : "Selecione uma conversa")}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {selected?.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.direction === "OUT" ? "ml-auto bg-wine text-white" : "bg-sand"}`}
            >
              <div className="whitespace-pre-wrap break-words">{message.body}</div>
              <div className="mt-1 text-[10px] opacity-70">{formatTime(message.createdAt)}</div>
            </div>
          ))}
        </div>
        {selected ? (
          <form action={formAction(sendWhatsApp)} className="grid shrink-0 gap-2 border-t border-line bg-paper p-4">
            <input type="hidden" name="conversationId" value={selected.id} />
            <input type="hidden" name="phone" value={selected.phone} />
            <Textarea name="body" placeholder="Escreva uma mensagem..." required className="min-h-20" />
            <Button>Enviar</Button>
          </form>
        ) : null}
      </Card>

      <Card className="hidden min-h-0 overflow-y-auto lg:block">
        <WhatsAppConnect initial={live} />
      </Card>
    </div>
  );
}
