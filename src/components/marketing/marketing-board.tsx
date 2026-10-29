"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Megaphone, MessageCircle, Send, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { useConfirm } from "@/components/confirm-dialog";
import {
  createMarketingCampaign,
  deleteMarketingCampaign,
  previewMarketingAudience,
  resolveMarketingRecipient,
  sendMarketingSelected,
  type MarketingSendResult,
} from "@/app/actions/marketing";
import {
  MARKETING_AUDIENCE_LABEL,
  MARKETING_CAP,
  MARKETING_DEFAULT_INACTIVE_DAYS,
  MARKETING_SEND_MAX,
  marketingLane,
  parseMarketingAudience,
  summarizeMarketing,
  type MarketingAudience,
} from "@/lib/marketing";
import { cn, formatPhoneBR } from "@/lib/utils";

function isSendOk(result: MarketingSendResult): result is Extract<MarketingSendResult, { ok: true }> {
  return "ok" in result;
}

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
  serviceId: string | null;
  inactiveDays: number | null;
  status: string;
  createdAt: string;
  sentAt: string | null;
  recipients: MarketingRecipientRow[];
};

export function MarketingBoard({
  campaigns,
  tags,
  services,
  canManage,
  connected,
  selectedId,
}: {
  campaigns: MarketingCampaignRow[];
  tags: string[];
  services: { id: string; name: string }[];
  canManage: boolean;
  connected: boolean;
  selectedId?: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [audience, setAudience] = useState<MarketingAudience>("SERVICE");
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);
  const selected = campaigns.find((row) => row.id === selectedId) ?? campaigns[0] ?? null;
  const summary = useMemo(() => summarizeMarketing(selected?.recipients ?? []), [selected]);
  const pending = selected?.recipients.filter((row) => marketingLane(row.status) === "pending") ?? [];
  const sent = selected?.recipients.filter((row) => marketingLane(row.status) === "sent") ?? [];
  const replied = selected?.recipients.filter((row) => marketingLane(row.status) === "replied") ?? [];
  const resolved = selected?.recipients.filter((row) => marketingLane(row.status) === "resolved") ?? [];

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
          ? `${result.count} clientes (lista limitada a ${MARKETING_CAP}).`
          : `${result.count} cliente${result.count === 1 ? "" : "s"} neste público.`,
      );
    }
  }

  async function onCreate(formData: FormData) {
    if (!canManage) return;
    setBusy(true);
    setMessage("");
    const result = await createMarketingCampaign(formData);
    setBusy(false);
    if (!("ok" in result)) {
      setMessage(result.error);
      return;
    }
    setPicked([]);
    setMessage(`${result.pending} clientes na coluna Pendente. Marque quem vai receber a mensagem.`);
    await refresh(result.campaignId);
  }

  async function onSend(ids: string[]) {
    if (!selected || !ids.length) return;
    if (ids.length > MARKETING_SEND_MAX) {
      setMessage(`Envie no máximo ${MARKETING_SEND_MAX} por vez para não sobrecarregar o WhatsApp.`);
      return;
    }
    const ok = await confirm({
      title: ids.length === 1 ? "Enviar para este cliente?" : `Enviar para ${ids.length} clientes selecionados?`,
      description: "Só quem você marcou recebe a mensagem. Os outros continuam em Pendente.",
      confirmLabel: "Enviar",
    });
    if (!ok) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("campaignId", selected.id);
    form.set("recipientIds", ids.join(","));
    const result = await sendMarketingSelected(form);
    setBusy(false);
    if (!isSendOk(result)) {
      setMessage(result.error);
      return;
    }
    setPicked((current) => current.filter((id) => !ids.includes(id)));
    setMessage(
      result.mocked
        ? `${result.sent} mensagens gravadas no Atendimento. WhatsApp não está conectado, então nada saiu no celular.`
        : `${result.sent} enviada${result.sent === 1 ? "" : "s"}. ${result.pending} ainda pendente${result.pending === 1 ? "" : "s"}.`,
    );
    await refresh(selected.id);
  }

  async function onResolve(id: string, resolvedFlag: boolean) {
    const form = new FormData();
    form.set("id", id);
    form.set("resolved", resolvedFlag ? "1" : "0");
    const result = await resolveMarketingRecipient(form);
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    await refresh(selected?.id);
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: "Excluir esta lista?",
      description: "O Kanban some. As conversas no WhatsApp ficam.",
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
    setPicked([]);
    await refresh();
  }

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllPending() {
    const ids = pending.map((row) => row.id);
    setPicked((current) => (ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : ids));
  }

  return (
    <div className="space-y-4">
      {!connected ? (
        <Card className="border-amber-200 bg-amber-50 text-amber-950">
          <p className="text-sm">
            WhatsApp desconectado. Em produção o envio só sai com a conexão aberta.{" "}
            <Link href="/marketing?tab=conexao" className="font-medium underline">
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
          <Field label="Nome da lista">
            <Input name="name" placeholder="Retorno depilação" maxLength={80} />
          </Field>
          <Field label="Público" required>
            <Select
              name="audience"
              value={audience}
              onChange={(event) => setAudience(parseMarketingAudience(event.target.value))}
            >
              <option value="SERVICE">{MARKETING_AUDIENCE_LABEL.SERVICE}</option>
              <option value="TAG">{MARKETING_AUDIENCE_LABEL.TAG}</option>
              <option value="INACTIVE">{MARKETING_AUDIENCE_LABEL.INACTIVE}</option>
              <option value="ALL">{MARKETING_AUDIENCE_LABEL.ALL}</option>
            </Select>
          </Field>
          {audience === "SERVICE" ? (
            <div className="md:col-span-2">
              <Field label="Serviço" required>
                <SearchSelect
                  name="serviceId"
                  required
                  placeholder="Ex.: depilação"
                  options={services.map((service) => ({ value: service.id, label: service.name }))}
                />
              </Field>
            </div>
          ) : null}
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
                placeholder="Oi {{nome}}, no {{salao}} está na hora de retocar a depilação. Quer encaixe?"
              />
            </Field>
            <p className="mt-1 text-xs text-ink-soft">
              Use {"{{nome}}"} e {"{{salao}}"}. A lista só monta o Kanban. O envio é manual, no máximo {MARKETING_SEND_MAX} por vez.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit" disabled={!canManage || busy}>
              <Megaphone size={16} />
              {busy ? "Montando..." : "Montar lista"}
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
          <p>Nenhuma lista ainda. Segmente o público e monte o Kanban.</p>
        </Card>
      )}

      {selected ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-medium">{selected.name}</h2>
              <p className="text-sm text-ink-soft">
                {MARKETING_AUDIENCE_LABEL[parseMarketingAudience(selected.audience)]}
                {selected.tag ? ` · ${selected.audience === "TAG" ? "#" : ""}${selected.tag}` : ""}
                {selected.inactiveDays ? ` · ${selected.inactiveDays} dias` : ""}
                {` · ${summary.pending} pendente · ${summary.sent + summary.failed} enviado · ${summary.replied} respondeu · ${summary.resolved} resolvido`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && pending.length ? (
                <>
                  <Button type="button" variant="outline" onClick={toggleAllPending} disabled={busy}>
                    {pending.every((row) => picked.includes(row.id)) ? "Limpar seleção" : "Selecionar pendentes"}
                  </Button>
                  <Button type="button" onClick={() => void onSend(picked)} disabled={busy || picked.length === 0}>
                    <Send size={16} />
                    Enviar selecionados{picked.length ? ` (${Math.min(picked.length, MARKETING_SEND_MAX)})` : ""}
                  </Button>
                </>
              ) : null}
              {canManage ? (
                <Button type="button" variant="danger" onClick={() => void onDelete(selected.id)} disabled={busy}>
                  <Trash2 size={16} />
                  Excluir
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            <KanbanColumn title="Pendente" count={pending.length} empty="Ninguém pendente nesta lista.">
              {pending.map((row) => (
                <RecipientCard
                  key={row.id}
                  row={row}
                  selectable={canManage}
                  checked={picked.includes(row.id)}
                  onToggle={() => toggle(row.id)}
                  action={
                    canManage ? (
                      <Button type="button" variant="outline" disabled={busy} onClick={() => void onSend([row.id])}>
                        Enviar
                      </Button>
                    ) : null
                  }
                />
              ))}
            </KanbanColumn>
            <KanbanColumn title="Enviado" count={sent.length} empty="Ainda sem envio nesta lista.">
              {sent.map((row) => (
                <RecipientCard
                  key={row.id}
                  row={row}
                  action={
                    canManage ? (
                      <Button type="button" variant="outline" disabled={busy} onClick={() => void onResolve(row.id, true)}>
                        Resolvido
                      </Button>
                    ) : null
                  }
                />
              ))}
            </KanbanColumn>
            <KanbanColumn title="Respondido" count={replied.length} empty="Ninguém respondeu ainda." tone="ok">
              {replied.map((row) => (
                <RecipientCard
                  key={row.id}
                  row={row}
                  action={
                    canManage ? (
                      <Button type="button" variant="outline" disabled={busy} onClick={() => void onResolve(row.id, true)}>
                        Resolvido
                      </Button>
                    ) : null
                  }
                />
              ))}
            </KanbanColumn>
            <KanbanColumn title="Resolvido" count={resolved.length} empty="Nada resolvido ainda." tone="done">
              {resolved.map((row) => (
                <RecipientCard
                  key={row.id}
                  row={row}
                  action={
                    canManage ? (
                      <Button type="button" variant="ghost" disabled={busy} onClick={() => void onResolve(row.id, false)}>
                        Reabrir
                      </Button>
                    ) : null
                  }
                />
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
  tone?: "ok" | "done";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line p-3",
        tone === "ok" ? "bg-emerald-50/60" : tone === "done" ? "bg-slate-50" : "bg-sand/60",
      )}
    >
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

function RecipientCard({
  row,
  selectable,
  checked,
  onToggle,
  action,
}: {
  row: MarketingRecipientRow;
  selectable?: boolean;
  checked?: boolean;
  onToggle?: () => void;
  action?: React.ReactNode;
}) {
  const href = row.conversationId ? `/atendimento?c=${row.conversationId}` : "/atendimento";
  return (
    <article className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-start gap-2">
        {selectable ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={onToggle}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
              checked ? "border-wine bg-wine text-white" : "border-line bg-paper",
            )}
          >
            {checked ? <Check size={12} /> : null}
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-medium">{row.clientName}</div>
          <div className="text-xs text-ink-soft">{formatPhoneBR(row.phone)}</div>
        </div>
        <Link href={href} className="mt-0.5 text-ink-soft hover:text-ink" aria-label="Abrir conversa">
          <MessageCircle size={16} />
        </Link>
      </div>
      {row.status === "FAILED" && row.error ? <p className="mt-2 text-xs text-red-700">{row.error}</p> : null}
      {row.replyPreview ? <p className="mt-2 line-clamp-2 text-sm text-ink">{row.replyPreview}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}
