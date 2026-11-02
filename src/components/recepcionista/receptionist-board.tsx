"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bot, ImageIcon } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveReceptionist, testReceptionist } from "@/app/actions/receptionist";
import { readProductPhoto } from "@/lib/product-photo";
import { settingsPath } from "@/lib/settings";
import {
  RECEPTIONIST_PRESETS,
  emojiLabel,
  personalityLabel,
  receptionistPreset,
  receptionistPresetId,
  styleLabel,
  type ReceptionistCatalog,
  type ReceptionistConfig,
  type ReceptionistEmoji,
  type ReceptionistPersonality,
  type ReceptionistStyle,
} from "@/lib/receptionist";
import { cn } from "@/lib/utils";

type ChatItem = { role: "user" | "assistant"; text: string };

function AvatarPreview({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const preset = receptionistPresetId(avatarUrl);
  const color = preset ? receptionistPreset(preset)?.color : null;
  if (avatarUrl && !avatarUrl.startsWith("preset:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
    );
  }
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold text-white"
      style={{ background: color ?? "#7C3AED" }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ReceptionistBoard({
  config,
  catalog,
  salonName,
  whatsappConnected,
  canEdit,
}: {
  config: ReceptionistConfig;
  catalog: ReceptionistCatalog;
  salonName: string;
  whatsappConnected: boolean;
  canEdit: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState(config.enabled);
  const [name, setName] = useState(config.name);
  const [avatarUrl, setAvatarUrl] = useState(config.avatarUrl ?? "preset:luna");
  const [style, setStyle] = useState<ReceptionistStyle>(config.style);
  const [personality, setPersonality] = useState<ReceptionistPersonality>(config.personality);
  const [emoji, setEmoji] = useState<ReceptionistEmoji>(config.emoji);
  const [instructions, setInstructions] = useState(config.instructions);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();
  const [draft, setDraft] = useState("");
  const [chat, setChat] = useState<ChatItem[]>([
    {
      role: "assistant",
      text: `Oi! Sou a ${config.name}, recepcionista do ${salonName}. Posso falar de serviços, valores e horários livres — ainda sem marcar sozinha.`,
    },
  ]);

  function persist() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const form = new FormData();
      form.set("enabled", enabled ? "1" : "0");
      form.set("name", name);
      form.set("avatarUrl", avatarUrl);
      form.set("style", style);
      form.set("personality", personality);
      form.set("emoji", emoji);
      form.set("instructions", instructions);
      const result = await saveReceptionist(form);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  function sendTest() {
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    setChat((current) => [...current, { role: "user", text: message }]);
    startTest(async () => {
      const form = new FormData();
      form.set("message", message);
      form.set("name", name);
      form.set("style", style);
      form.set("personality", personality);
      form.set("emoji", emoji);
      form.set("instructions", instructions);
      form.set("history", JSON.stringify(chat));
      const result = await testReceptionist(form);
      setChat((current) => [
        ...current,
        {
          role: "assistant",
          text:
            result && "text" in result && result.text
              ? result.text
              : result && "error" in result && result.error
                ? result.error
                : "Não consegui responder agora.",
        },
      ]);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Recepcionista</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Atendente virtual no WhatsApp do salão. Só responde quando a cliente escreve, simula digitando e não marca sozinha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              enabled ? "bg-emerald-50 text-emerald-700" : "bg-sand text-ink-soft",
            )}
          >
            {enabled ? "Ligada" : "Desligada"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <Card className="space-y-5">
          <label className="flex items-start justify-between gap-4 rounded-xl border border-line bg-sand/50 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Atendimento automático</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Com o WhatsApp conectado, ela só fala depois que a cliente manda mensagem. Se alguém da equipe enviar no Inbox, ela pausa.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={!canEdit}
              onClick={() => setEnabled((value) => !value)}
              className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", enabled ? "bg-wine" : "bg-slate-300")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", enabled ? "left-5" : "left-0.5")} />
            </button>
          </label>

          {!whatsappConnected ? (
            <p className="text-sm text-ink-soft">
              WhatsApp desconectado.{" "}
              <Link href={settingsPath("whatsapp")} className="font-medium text-wine">
                Conectar em Configurações
              </Link>
            </p>
          ) : null}

          <div className="flex items-center gap-4">
            <AvatarPreview name={name} avatarUrl={avatarUrl} />
            <div className="min-w-0">
              <p className="font-medium">{name || "Recepcionista"}</p>
              <p className="text-xs text-ink-soft">
                {styleLabel(style)} · {personalityLabel(personality)} · {emojiLabel(emoji)}
              </p>
            </div>
          </div>

          <Field label="Nome">
            <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} maxLength={40} />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-soft">Avatar</p>
            <div className="flex flex-wrap gap-2">
              {RECEPTIONIST_PRESETS.map((preset) => {
                const active = avatarUrl === `preset:${preset.id}`;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setAvatarUrl(`preset:${preset.id}`)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-2 py-1.5 text-sm",
                      active ? "border-wine bg-wine/5" : "border-line hover:bg-sand",
                    )}
                  >
                    <span className="h-7 w-7 rounded-full" style={{ background: preset.color }} />
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-sand"
              >
                <ImageIcon size={14} />
                Enviar foto
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void readProductPhoto(file).then(setAvatarUrl).catch((err: Error) => setError(err.message));
              }}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Estilo">
              <Select value={style} disabled={!canEdit} onChange={(event) => setStyle(event.target.value as ReceptionistStyle)}>
                <option value="conversador">Conversadora</option>
                <option value="direto">Objetiva e direta</option>
              </Select>
            </Field>
            <Field label="Personalidade">
              <Select
                value={personality}
                disabled={!canEdit}
                onChange={(event) => setPersonality(event.target.value as ReceptionistPersonality)}
              >
                <option value="feliz">Feliz e educada</option>
                <option value="brincalhao">Brincalhona</option>
                <option value="formal">Formal e respeitosa</option>
              </Select>
            </Field>
            <Field label="Emojis">
              <Select value={emoji} disabled={!canEdit} onChange={(event) => setEmoji(event.target.value as ReceptionistEmoji)}>
                <option value="nenhum">Sem emojis</option>
                <option value="moderado">Uso moderado</option>
                <option value="sempre">Sempre usar</option>
              </Select>
            </Field>
          </div>

          <Field label="Instruções do salão">
            <Textarea
              value={instructions}
              disabled={!canEdit}
              maxLength={500}
              placeholder="Ex.: não oferecemos química sem avaliação. Horário de almoço das 12h às 13h."
              onChange={(event) => setInstructions(event.target.value)}
            />
          </Field>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {saved ? <p className="text-sm text-emerald-700">Configuração salva.</p> : null}

          {canEdit ? (
            <Button type="button" disabled={pending} onClick={persist}>
              {pending ? "Salvando..." : "Salvar recepcionista"}
            </Button>
          ) : (
            <p className="text-sm text-ink-soft">Consulta apenas. Peça ao proprietário para alterar a recepcionista.</p>
          )}
        </Card>

        <Card className="flex min-h-[32rem] flex-col p-0">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-wine">
              <Bot size={18} />
            </div>
            <div>
              <p className="font-medium">Testar conversa</p>
              <p className="text-xs text-ink-soft">Usa a tabela e os horários reais. Não envia no WhatsApp.</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
            {chat.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                  item.role === "assistant" ? "bg-sand" : "ml-auto bg-wine text-white",
                )}
              >
                {item.text}
              </div>
            ))}
          </div>
          <div className="grid gap-2 border-t border-line p-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ex.: tem horário de escova amanhã?"
              className="min-h-16"
            />
            <Button type="button" disabled={testing || !draft.trim()} onClick={sendTest}>
              {testing ? "Pensando..." : "Enviar teste"}
            </Button>
            <p className="text-xs text-ink-soft">
              {catalog.services.length} serviços e {catalog.professionals.length} profissionais no catálogo.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
