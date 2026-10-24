import { AssistantChat } from "@/components/assistant-chat";
import { askAssistant } from "@/app/actions/ai";

export default async function IaPage() {
  const greeting = await askAssistant("");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Assistente de IA</h1>
        <p className="text-ink-soft">
          A MegaBeauty lê agenda, faturamento, estoque e no-shows. A chave OpenAI é única na plataforma e vale para todos os salões.
        </p>
      </div>
      <AssistantChat greeting={greeting.answer} />
    </div>
  );
}
