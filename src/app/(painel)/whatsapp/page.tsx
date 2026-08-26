import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { saveEvolutionSettings, sendWhatsApp } from "@/app/actions/whatsapp";
import { isEvolutionConfigured } from "@/lib/evolution";
import { formatTime } from "@/lib/dates";
import { formAction } from "@/lib/utils";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { session, tenant } = await requireTenant();
  const params = await searchParams;
  const selectedId = typeof params.c === "string" ? params.c : null;

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: session.tenantId },
    include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { lastMessageAt: "desc" },
  });
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const configured = isEvolutionConfigured({
    url: tenant.evolutionUrl ?? process.env.EVOLUTION_API_URL ?? "",
    apiKey: tenant.evolutionApiKey ?? process.env.EVOLUTION_API_KEY ?? "",
    instance: tenant.evolutionInstance ?? "",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">WhatsApp</h1>
          <p className="text-ink-soft">
            Inbox do salão via Evolution API. {configured ? "Instância conectada." : "Modo demonstração — configure a API para envio real."}
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <Card className="p-0">
          {conversations.map((c) => (
            <a
              key={c.id}
              href={`/whatsapp?c=${c.id}`}
              className={`block border-b border-line px-4 py-3 ${selected?.id === c.id ? "bg-sand" : ""}`}
            >
              <div className="font-medium">{c.client?.name ?? c.phone}</div>
              <div className="truncate text-xs text-ink-soft">{c.messages.at(-1)?.body}</div>
            </a>
          ))}
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
          <h2 className="font-display text-2xl">Evolution API</h2>
          <form action={formAction(saveEvolutionSettings)} className="mt-4 grid gap-3">
            <Field label="URL da API">
              <Input name="evolutionUrl" defaultValue={tenant.evolutionUrl ?? ""} placeholder="https://evo.seudominio.com" />
            </Field>
            <Field label="API Key">
              <Input name="evolutionApiKey" defaultValue={tenant.evolutionApiKey ?? ""} type="password" />
            </Field>
            <Field label="Instância">
              <Input name="evolutionInstance" defaultValue={tenant.evolutionInstance ?? ""} placeholder="studio-aurora" />
            </Field>
            <Button>Salvar conexão</Button>
          </form>
          <p className="mt-3 text-xs text-ink-soft">
            Webhook: <code>/api/webhooks/evolution?tenant={tenant.slug}</code>
          </p>
        </Card>
      </div>
    </div>
  );
}
