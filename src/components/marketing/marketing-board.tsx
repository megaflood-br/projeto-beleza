"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, MessageCircle, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useConfirm } from "@/components/confirm-dialog";
import {
  createMarketingCampaign,
  deleteMarketingCampaign,
  previewMarketingAudience,
  sendMarketingBatch,
  type MarketingSendResult,
} from "@/app/actions/marketing";

function isSendOk(result: MarketingSendResult): result is Extract<MarketingSendResult, { ok: true }> {
  return "ok" in result;
}
import {
  MARKETING_AUDIENCE_LABEL,
  MARKETING_BATCH,
  MARKETING_CAP,
  MARKETING_DEFAULT_INACTIVE_DAYS,
  marketingLane,
  parseMarketingAudience,
  summarizeMarketing,
  type MarketingAudience,
} from "@/lib/marketing";
import { cn, formatPhoneBR } from "@/lib/utils";

export type MarketingRecipientRow = {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  repliedAt: string | null;
  replyPreview: string | null;
  conversationId: string | null;
};

export type MarketingCampaignRow = {
  id: string;
  name: string;
  body: string;
  audience: string;
  tag: string | null;
  inactiveDays: number | null;
  status: string;
  createdAt: string;
  sentAt: string | null;
  recipients: MarketingRecipientRow[];
};

export function MarketingBoard({
  campaigns,
  tags,
  canManage,
  connected,
  selectedId,
}: {
  campaigns: MarketingCampaignRow[];
  tags: string[];
  canManage: boolean;
  connected: boolean;
  selectedId?: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [audience, setAudience] = useState<MarketingAudience>("ALL");
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const selected = campaigns.find((row) => row.id === selectedId) ?? campaigns[0] ?? null;
  const summary = useMemo(() => summarizeMarketing(selected?.recipients ?? []), [selected]);

  async function refresh(id?: string) {
    router.push(id ? `/marketing?c=${id}` : "/marketing");
    router.refresh();
  }

  async function onPreview(formData: FormData) {
    setBusy(true);
    const result = await previewMarketingAudience(formData);
    setBusy(false);
    if ("error" in result && result.error) {
      setPreview(result.error);
      return;
    }
    if ("ok" in result) {
      setPreview(
        result.capped
          ? `${result.count} clientes (limite de ${MARKETING_CAP} por disparo).`
          : `${result.count} cliente${result.count === 1 ? "" : "s"} neste público.`,
      );
    }
  }

  async function onCreate(formData: FormData) {
    if (!canManage) return;
    setBusy(true);
    setMessage("");
    const result = await createMarketingCampaign(formData);
    if (!isSendOk(result)) {
      setBusy(false);
      setMessage(result.error);
      if (result.campaignId) await refresh(result.campaignId);
      return;
    }
    let pending = result.pending;
    let sent = result.sent;
    let mocked = result.mocked;
    const campaignId = result.campaignId;
    while (pending > 0 && campaignId) {
      const next = new FormData();
      next.set("campaignId", campaignId);
      const batch = await sendMarketingBatch(next);
      if (!isSendOk(batch)) {
        setMessage(batch.error);
        break;
      }
      pending = batch.pending;
      sent += batch.sent;
      mocked += batch.mocked;
    }
    setBusy(false);
    setMessage(
      mocked
        ? `${sent} mensagens gravadas no Inbox. WhatsApp não está conectado, então nada saiu no celular.`
        : `${sent} mensagens enviadas${pending ? `. Ainda restam ${pending} na fila.` : "."}`,
    );
    await refresh(campaignId);
  }

  async function onContinue() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    let pending = summary.pending;
    let sent = 0;
    while (pending > 0) {
      const form = new FormData();
      form.set("campaignId", selected.id);
      const batch = await sendMarketingBatch(form);
      if (!isSendOk(batch)) {
        setMessage(batch.error);
        break;
      }
      pending = batch.pending;
      sent += batch.sent;
    }
    setBusy(false);
    setMessage(sent ? `${sent} mensagens do lote seguinte foram enviadas.` : "Nada pendente neste disparo.");
    await refresh(selected.id);
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: "Excluir esta campanha?",
      description: "O Kanban e o histórico deste disparo somem. As conversas no WhatsApp ficam.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    const form = new FormData();
    form.set("id", id);
    const result = await deleteMarketingCampaign(form);
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    await refresh();
  }

  const waiting = selected?.recipients.filter((row) => marketingLane(row.status) === "waiting") ?? [];
  const replied = selected?.recipients.filter((row) => marketingLane(row.status) === "replied") ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Marketing</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Dispare uma campanha no WhatsApp e acompanhe quem respondeu. As campanhas automáticas continuam na aba WhatsApp.
          </p>
        </div>
      </div>

      {!connected ? (
        <Card className="border-amber-200 bg-amber-50 text-amber-950">
          <p className="text-sm">
            WhatsApp desconectado. Em produção o disparo só sai com a conexão aberta.{" "}
            <Link href="/whatsapp?tab=conexao" className="font-medium underline">
              Abrir conexão
            </Link>
          </p>
        </Card>
      ) : null}

      <Card>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreate(new FormData(event.currentTarget));
          }}
        >
          <Field label="Nome da campanha">
            <Input name="name" placeholder="Black Friday — retorno" maxLength={80} />
          </Field>
          <Field label="Público" required>
            <Select
              name="audience"
              value={audience}
              onChange={(event) => setAudience(parseMarketingAudience(event.target.value))}
            >
              <option value="ALL">{MARKETING_AUDIENCE_LABEL.ALL}</option>
              <option value="TAG">{MARKETING_AUDIENCE_LABEL.TAG}</option>
              <option value="INACTIVE">{MARKETING_AUDIENCE_LABEL.INACTIVE}</option>
            </Select>
          </Field>
          {audience === "TAG" ? (
            <Field label="Hashtag" required>
              <Input name="tag" list="marketing-tags" placeholder="vip" />
              <datalist id="marketing-tags">
                {tags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </Field>
          ) : null}
          {audience === "INACTIVE" ? (
            <Field label="Sem visita há (dias)">
              <Input name="inactiveDays" type="number" min={7} max={365} defaultValue={MARKETING_DEFAULT_INACTIVE_DAYS} />
            </Field>
          ) : null}
          <div className="md:col-span-2">
            <Field label="Mensagem" required>
              <Textarea
                name="body"
                required
                minLength={8}
                placeholder="Oi {{nome}}, no {{salao}} tem horário esta semana. Quer encaixe?"
              />
            </Field>
            <p className="mt-1 text-xs text-ink-soft">Use {"{{nome}}"} e {"{{salao}}"}. Envio em lotes de {MARKETING_BATCH}, até {MARKETING_CAP} clientes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit" disabled={!canManage || busy}>
              <Megaphone size={16} />
              {busy ? "Disparando..." : "Disparar campanha"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) void onPreview(new FormData(form));
              }}
            >
              Contar público
            </Button>
            {preview ? <span className="text-sm text-ink-soft">{preview}</span> : null}
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-ink-soft">{message}</p> : null}
      </Card>

      {campaigns.length ? (
        <div className="flex flex-wrap gap-2">
          {campaigns.map((row) => (
            <Link
              key={row.id}
              href={`/marketing?c=${row.id}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                selected?.id === row.id ? "border-wine bg-wine text-white" : "border-line bg-paper text-ink hover:bg-sand",
              )}
            >
              {row.name}
            </Link>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-2 py-12 text-center text-ink-soft">
          <Megaphone size={28} />
          <p>Nenhuma campanha ainda. Escreva a mensagem e dispare para ver o Kanban.</p>
        </Card>
      )}

      {selected ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-medium">{selected.name}</h2>
              <p className="text-sm text-ink-soft">
                {MARKETING_AUDIENCE_LABEL[parseMarketingAudience(selected.audience)]}
                {selected.tag ? ` · #${selected.tag}` : ""}
                {selected.inactiveDays ? ` · ${selected.inactiveDays} dias` : ""}
                {` · ${summary.sent + summary.replied} enviadas · ${summary.replied} responderam · ${summary.pending} na fila`}
                {summary.failed ? ` · ${summary.failed} falharam` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.pending > 0 && canManage ? (
                <Button type="button" onClick={() => void onContinue()} disabled={busy}>
                  Enviar próximo lote
                </Button>
              ) : null}
              {canManage ? (
                <Button type="button" variant="danger" onClick={() => void onDelete(selected.id)} disabled={busy}>
                  <Trash2 size={16} />
                  Excluir
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <KanbanColumn title="Sem resposta" count={waiting.length} empty="Ninguém nesta coluna.">
              {waiting.map((row) => (
                <RecipientCard key={row.id} row={row} />
              ))}
            </KanbanColumn>
            <KanbanColumn title="Responderam" count={replied.length} empty="Ainda sem resposta neste disparo." tone="ok">
              {replied.map((row) => (
                <RecipientCard key={row.id} row={row} />
              ))}
            </KanbanColumn>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  empty,
  tone,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  tone?: "ok";
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-line p-3", tone === "ok" ? "bg-emerald-50/60" : "bg-sand/60")}>
      <header className="mb-3 flex items-center justify-between px-1">
        <h3 className="font-medium">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-soft">{count}</span>
      </header>
      <div className="space-y-2">
        {count ? children : <p className="px-2 py-8 text-center text-sm text-ink-soft">{empty}</p>}
      </div>
    </section>
  );
}

function RecipientCard({ row }: { row: MarketingRecipientRow }) {
  const href = row.conversationId ? `/whatsapp?c=${row.conversationId}` : "/whatsapp";
  return (
    <Link href={href} className="block rounded-xl border border-line bg-white p-3 hover:border-wine/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{row.clientName}</div>
          <div className="text-xs text-ink-soft">{formatPhoneBR(row.phone)}</div>
        </div>
        <MessageCircle size={16} className="mt-0.5 text-ink-soft" />
      </div>
      {row.status === "FAILED" && row.error ? (
        <p className="mt-2 text-xs text-red-700">{row.error}</p>
      ) : null}
      {row.replyPreview ? <p className="mt-2 line-clamp-2 text-sm text-ink">{row.replyPreview}</p> : null}
    </Link>
  );
}
