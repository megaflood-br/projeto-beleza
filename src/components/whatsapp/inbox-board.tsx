import { Button, Card, Textarea } from "@/components/ui";
import { sendWhatsApp } from "@/app/actions/whatsapp";
import { setConversationBotPaused } from "@/app/actions/receptionist";
import { formatTime } from "@/lib/dates";
import { displayPhoneBR, formAction } from "@/lib/utils";
import { InboxClientPanel, type InboxClientProfile } from "@/components/whatsapp/inbox-client-panel";

type InboxConversation = {
  id: string;
  phone: string;
  botPaused?: boolean;
  client: { name: string } | null;
  messages: { id: string; direction: string; body: string; source?: string; createdAt: Date }[];
};

export function InboxBoard({
  conversations,
  selectedId,
  profile,
  hidePhones = false,
  receptionistEnabled = false,
  receptionistName = "Luna",
}: {
  conversations: InboxConversation[];
  selectedId: string | null;
  profile: InboxClientProfile | null;
  hidePhones?: boolean;
  receptionistEnabled?: boolean;
  receptionistName?: string;
}) {
  const selected = conversations.find((row) => row.id === selectedId) ?? conversations[0];

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)_minmax(18rem,22rem)]">
      <Card className="flex max-h-56 min-h-0 flex-col overflow-hidden p-0 lg:max-h-none">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length ? (
            conversations.map((conversation) => (
              <a
                key={conversation.id}
                href={`/atendimento?c=${conversation.id}`}
                className={`block border-b border-line px-4 py-3 ${selected?.id === conversation.id ? "bg-sand" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 truncate font-medium">
                    {conversation.client?.name ?? (hidePhones ? "Conversa" : displayPhoneBR(conversation.phone))}
                  </div>
                  {receptionistEnabled && conversation.botPaused ? (
                    <span className="shrink-0 rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
                      pausada
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-ink-soft">{conversation.messages.at(-1)?.body}</div>
              </a>
            ))
          ) : (
            <p className="px-4 py-10 text-center text-sm text-ink-soft">Nenhuma conversa ainda.</p>
          )}
        </div>
      </Card>

      <Card className="flex min-h-[22rem] min-w-0 flex-col overflow-hidden p-0 lg:min-h-0">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0 truncate font-medium">
            {selected?.client?.name ?? (selected ? (hidePhones ? "Conversa" : displayPhoneBR(selected.phone)) : "Selecione uma conversa")}
          </div>
          {selected && receptionistEnabled ? (
            <form action={formAction(setConversationBotPaused)}>
              <input type="hidden" name="conversationId" value={selected.id} />
              <input type="hidden" name="paused" value={selected.botPaused ? "0" : "1"} />
              <button type="submit" className="shrink-0 text-xs font-medium text-wine">
                {selected.botPaused ? `Retomar ${receptionistName}` : `Pausar ${receptionistName}`}
              </button>
            </form>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {selected?.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.direction === "OUT" ? "ml-auto bg-wine text-white" : "bg-sand"}`}
            >
              {message.source === "BOT" ? (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">{receptionistName}</div>
              ) : null}
              <div className="whitespace-pre-wrap break-words">{message.body}</div>
              <div className="mt-1 text-[10px] opacity-70">{formatTime(message.createdAt)}</div>
            </div>
          ))}
        </div>
        {selected ? (
          <form action={formAction(sendWhatsApp)} className="grid shrink-0 gap-2 border-t border-line bg-paper p-4">
            <input type="hidden" name="conversationId" value={selected.id} />
            {hidePhones ? null : <input type="hidden" name="phone" value={selected.phone} />}
            {receptionistEnabled && !selected.botPaused ? (
              <p className="text-xs text-ink-soft">Enviar por aqui pausa a {receptionistName} nesta conversa.</p>
            ) : null}
            <Textarea name="body" placeholder="Escreva uma mensagem..." required className="min-h-20" />
            <Button>Enviar</Button>
          </form>
        ) : null}
      </Card>

      <Card className="min-h-0 overflow-y-auto p-0">
        <InboxClientPanel profile={profile} hidePhones={hidePhones} />
      </Card>
    </div>
  );
}
