"use client";

import { useEffect, useMemo, useState } from "react";
import { Headphones, Phone, Plus, Search, Send } from "lucide-react";
import { Badge, Button, Input, Textarea } from "@/components/ui";
import { TicketComposer } from "@/components/suporte/ticket-composer";
import { useSupportLive } from "@/components/suporte/live-context";
import { sendSupportMessage, startSupportCall, updateSupportTicket } from "@/app/actions/support";
import {
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_PRIORITY_COLOR,
  SUPPORT_PRIORITY_LABEL,
  SUPPORT_TICKET_STATUS_COLOR,
  SUPPORT_TICKET_STATUS_LABEL,
  type SupportTicketStatus,
} from "@/lib/constants";
import { formatSupportWhen } from "@/lib/support";
import { cn } from "@/lib/utils";

export function SupportBoard({
  side,
  initialTicketId,
}: {
  side: "PLATFORM" | "SALON";
  initialTicketId?: string | null;
}) {
  const { state, selectedId, setSelectedId, refresh } = useSupportLive();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus | "ALL">("ALL");
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (initialTicketId) setSelectedId(initialTicketId);
  }, [initialTicketId, setSelectedId]);

  const tickets = state?.tickets ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((row) => {
      if (status !== "ALL" && row.status !== status) return false;
      if (!q) return true;
      return (
        row.subject.toLowerCase().includes(q) ||
        row.tenantName.toLowerCase().includes(q) ||
        String(row.number).includes(q) ||
        row.lastPreview.toLowerCase().includes(q)
      );
    });
  }, [query, status, tickets]);

  const ticket = state?.ticket && state.ticket.id === selectedId ? state.ticket : null;
  const adminOnline = Boolean(state?.adminOnline);
  const salonOnline = Boolean(ticket && state?.onlineSalons.some((row) => row.tenantId === ticket.tenantId));

  async function send(formData: FormData) {
    setError(null);
    if (ticket) formData.set("ticketId", ticket.id);
    const result = await sendSupportMessage(formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setDraft("");
    await refresh();
  }

  async function changeStatus(next: SupportTicketStatus) {
    if (!ticket) return;
    const fd = new FormData();
    fd.set("id", ticket.id);
    fd.set("status", next);
    const result = await updateSupportTicket(fd);
    if (result && "error" in result && result.error) setError(result.error);
    await refresh();
  }

  async function callNow(tenantId?: string) {
    setError(null);
    const fd = new FormData();
    if (tenantId) fd.set("tenantId", tenantId);
    if (ticket?.id) fd.set("ticketId", ticket.id);
    const result = await startSupportCall(fd);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (result && "ticketId" in result && result.ticketId) setSelectedId(result.ticketId);
    await refresh();
  }

  const counts = {
    open: tickets.filter((row) => row.status === "OPEN").length,
    pending: tickets.filter((row) => row.status === "PENDING").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{side === "PLATFORM" ? "Suporte" : "Ajuda"}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {side === "PLATFORM"
              ? "Tickets e chat ao vivo com todos os salões."
              : "Fale com o suporte MegaBeauty por ticket ou chamada ao vivo."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {side === "SALON" ? (
            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                adminOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-ink-soft",
              )}
            >
              {adminOnline ? "Suporte online" : "Suporte offline — abra um ticket"}
            </div>
          ) : (
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-ink-soft">
              {state?.onlineSalons.length ?? 0} salão(ões) online
            </div>
          )}
          {side === "SALON" && adminOnline ? (
            <Button type="button" variant="success" onClick={() => callNow()}>
              <Phone size={16} /> Chamar agora
            </Button>
          ) : null}
          <Button type="button" onClick={() => setComposing(true)}>
            <Plus size={16} /> Novo ticket
          </Button>
        </div>
      </div>

      {side === "PLATFORM" && state?.onlineSalons.length ? (
        <div className="flex flex-wrap gap-2">
          {state.onlineSalons.map((salon) => (
            <button
              key={salon.tenantId}
              type="button"
              onClick={() => callNow(salon.tenantId)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {salon.name}
              <Phone size={12} />
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-line lg:border-r lg:border-b-0">
          <div className="space-y-2 border-b border-line p-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
              <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ticket" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["ALL", "OPEN", "PENDING", "RESOLVED", "CLOSED"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    status === key ? "border-blue-600 bg-blue-50 font-medium text-blue-700" : "border-line text-ink-soft",
                  )}
                >
                  {key === "ALL" ? `Todos (${tickets.length})` : SUPPORT_TICKET_STATUS_LABEL[key]}
                  {key === "OPEN" ? ` ${counts.open}` : key === "PENDING" ? ` ${counts.pending}` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {!visible.length ? (
              <p className="px-4 py-10 text-center text-sm text-ink-soft">Nenhum ticket neste filtro.</p>
            ) : (
              visible.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    "block w-full border-b border-line px-4 py-3 text-left",
                    selectedId === row.id ? "bg-sand" : "hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        #{row.number} {row.subject}
                      </div>
                      <div className="truncate text-xs text-ink-soft">
                        {side === "PLATFORM" ? row.tenantName : SUPPORT_CATEGORY_LABEL[row.category]} · {row.lastPreview}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] text-ink-soft">{formatSupportWhen(row.lastMessageAt)}</div>
                      {row.unread ? (
                        <span className="mt-1 inline-flex min-w-5 justify-center rounded-full bg-wine px-1.5 text-[10px] font-semibold text-white">
                          {row.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[480px] flex-col">
          {!ticket ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-ink-soft">
              <Headphones size={28} />
              <p>Selecione um ticket ou abra um novo pedido de ajuda.</p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <div className="font-medium">
                    #{ticket.number} {ticket.subject}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <span>{ticket.tenantName}</span>
                    <Badge color={SUPPORT_TICKET_STATUS_COLOR[ticket.status]}>{SUPPORT_TICKET_STATUS_LABEL[ticket.status]}</Badge>
                    <Badge color={SUPPORT_PRIORITY_COLOR[ticket.priority]}>{SUPPORT_PRIORITY_LABEL[ticket.priority]}</Badge>
                    <span>{SUPPORT_CATEGORY_LABEL[ticket.category]}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {side === "PLATFORM" && salonOnline ? (
                    <Button type="button" variant="success" className="h-9 px-3 text-xs" onClick={() => callNow(ticket.tenantId)}>
                      <Phone size={14} /> Chamar salão
                    </Button>
                  ) : null}
                  {side === "PLATFORM" && ticket.status !== "RESOLVED" ? (
                    <Button type="button" variant="outline" className="h-9 px-3 text-xs" onClick={() => changeStatus("RESOLVED")}>
                      Resolver
                    </Button>
                  ) : null}
                  {side === "PLATFORM" && ticket.status !== "CLOSED" ? (
                    <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => changeStatus("CLOSED")}>
                      Fechar
                    </Button>
                  ) : null}
                  {side === "PLATFORM" && ticket.status !== "OPEN" ? (
                    <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => changeStatus("OPEN")}>
                      Reabrir
                    </Button>
                  ) : null}
                </div>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {ticket.messages.map((message) => {
                  if (message.kind === "SYSTEM") {
                    return (
                      <div key={message.id} className="text-center text-[11px] text-ink-soft">
                        {message.body} · {formatSupportWhen(message.createdAt)}
                      </div>
                    );
                  }
                  const mine = message.authorId === state?.me.id;
                  return (
                    <div
                      key={message.id}
                      className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "ml-auto bg-wine text-white" : "bg-sand")}
                    >
                      <div className={cn("mb-0.5 text-[11px]", mine ? "text-white/70" : "text-ink-soft")}>{message.authorName}</div>
                      <div className="whitespace-pre-wrap">{message.body}</div>
                      <div className={cn("mt-1 text-[10px]", mine ? "text-white/60" : "text-ink-soft")}>
                        {formatSupportWhen(message.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form action={send} className="grid gap-2 border-t border-line p-3">
                <Textarea
                  name="body"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  required
                  className="min-h-20"
                />
                <div className="flex justify-end">
                  <Button type="submit">
                    <Send size={14} /> Enviar
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      <TicketComposer
        open={composing}
        side={side}
        tenants={state?.tenants}
        onClose={() => setComposing(false)}
        onCreated={(id) => {
          setSelectedId(id);
          void refresh();
        }}
      />
    </div>
  );
}
