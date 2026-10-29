"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  Coins,
  Gift,
  Heart,
  KeyRound,
  Link2,
  Package,
  Receipt,
  RotateCcw,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import { saveWhatsAppCampaign, sendCampaignTest, toggleWhatsAppCampaign } from "@/app/actions/whatsapp-campaigns";
import { CAMPAIGN_CATALOG, CAMPAIGN_VARIABLES, campaignByTrigger } from "@/lib/whatsapp-campaigns";
import { cn } from "@/lib/utils";

const ICONS = {
  gift: Gift,
  user: UserRound,
  bell: Bell,
  heart: Heart,
  rotate: RotateCcw,
  calendar: CalendarCheck,
  sparkles: Sparkles,
  link: Link2,
  coins: Coins,
  package: Package,
  receipt: Receipt,
  star: Star,
  key: KeyRound,
} as const;

export type CampaignRow = { id: string; trigger: string; template: string; active: boolean };

export function CampaignsBoard({
  campaigns,
  canManage,
  connected,
}: {
  campaigns: CampaignRow[];
  canManage: boolean;
  connected: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const byTrigger = useMemo(() => new Map(campaigns.map((row) => [row.trigger, row])), [campaigns]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        {connected
          ? "Com o WhatsApp conectado, as campanhas ligadas saem sozinhas no horário certo."
          : "As campanhas ficam prontas. Conecte o WhatsApp na aba Conexão para o envio automático."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CAMPAIGN_CATALOG.map((item) => {
          const row = byTrigger.get(item.trigger);
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Gift;
          const active = row?.active ?? item.defaultActive;
          return (
            <article key={item.trigger} className="flex min-h-[240px] flex-col rounded-2xl border border-line bg-white p-5">
              <div className="mb-3 text-ink-soft">
                <Icon size={22} />
              </div>
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{item.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    disabled={!canManage || !row}
                    onClick={() => {
                      if (!row) return;
                      const form = new FormData();
                      form.set("id", row.id);
                      form.set("active", active ? "0" : "1");
                      void toggleWhatsAppCampaign(form).then(() => router.refresh());
                    }}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition disabled:opacity-50",
                      active ? "bg-blue-600" : "bg-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition",
                        active && "translate-x-5",
                      )}
                    />
                  </button>
                  Envio automático
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
                  disabled={!row}
                  onClick={() => row && setEditing(row)}
                >
                  Personalizar
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {editing ? (
        <CampaignDrawer
          key={editing.id}
          campaign={editing}
          canManage={canManage}
          connected={connected}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function CampaignDrawer({
  campaign,
  canManage,
  connected,
  onClose,
}: {
  campaign: CampaignRow;
  canManage: boolean;
  connected: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const catalog = campaignByTrigger(campaign.trigger);
  const [template, setTemplate] = useState(campaign.template);
  const [active, setActive] = useState(campaign.active);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<"test" | "save" | null>(null);
  const [testPhone, setTestPhone] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-medium">{catalog?.title ?? campaign.trigger}</h2>
          <p className="mt-1 text-sm text-ink-soft">{catalog?.description}</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Mensagem">
            <Textarea value={template} onChange={(event) => setTemplate(event.target.value)} className="min-h-40" />
          </Field>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_VARIABLES.map((item) => (
              <button
                key={item.key}
                type="button"
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:bg-sand"
                onClick={() => setTemplate((current) => `${current} {{${item.key}}}`)}
              >
                {`{{${item.key}}}`} · {item.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Envio automático
          </label>
          <Field label="Celular para teste" required>
            <input
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder="DDD + número, ex. 11985521672"
              inputMode="tel"
              className="h-11 w-full rounded-lg border border-line px-3 text-sm"
            />
          </Field>
          {!connected ? (
            <p className="text-sm text-amber-700">
              Conecte o WhatsApp na aba Conexão para o teste sair no celular. Sem conexão, a mensagem só aparece no Atendimento.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending !== null}
                onClick={() => {
                  setPending("test");
                  setError(null);
                  setSuccess(null);
                  const form = new FormData();
                  form.set("id", campaign.id);
                  form.set("phone", testPhone);
                  form.set("template", template);
                  void sendCampaignTest(form)
                    .then((result) => {
                      if (result && "error" in result && result.error) {
                        setError(result.error);
                        return;
                      }
                      if (result && "message" in result && result.message) {
                        setSuccess(result.message);
                      }
                      router.refresh();
                    })
                    .catch(() => setError("Não foi possível enviar o teste."))
                    .finally(() => setPending(null));
                }}
              >
                {pending === "test" ? "Enviando..." : "Enviar teste"}
              </Button>
              <Button
                type="button"
                disabled={pending !== null}
                onClick={() => {
                  setPending("save");
                  setError(null);
                  setSuccess(null);
                  const form = new FormData();
                  form.set("id", campaign.id);
                  form.set("template", template);
                  form.set("active", active ? "1" : "0");
                  void saveWhatsAppCampaign(form)
                    .then((result) => {
                      if (result && "error" in result && result.error) {
                        setError(result.error);
                        return;
                      }
                      onClose();
                      router.refresh();
                    })
                    .finally(() => setPending(null));
                }}
              >
                {pending === "save" ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
