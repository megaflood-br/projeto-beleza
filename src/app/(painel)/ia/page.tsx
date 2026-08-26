import { AssistantChat } from "@/components/assistant-chat";
import { askAssistant } from "@/app/actions/ai";

export default async function IaPage() {
  const greeting = await askAssistant("");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Assistente de IA</h1>
        <p className="text-ink-soft">
          A MegaBeauty lê agenda, faturamento, estoque e no-shows. Com a chave OpenAI, as respostas ficam ainda mais precisas.
        </p>
      </div>
      <AssistantChat greeting={greeting.answer} />
    </div>
  );
}
