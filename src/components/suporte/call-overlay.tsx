"use client";

import { Phone, PhoneOff, Radio } from "lucide-react";
import { Button } from "@/components/ui";
import { acceptSupportCall, declineSupportCall, endSupportCall } from "@/app/actions/support";
import { useSupportLive } from "@/components/suporte/live-context";

export function SupportCallOverlay() {
  const { state, setSelectedId, refresh } = useSupportLive();
  if (!state) return null;

  const incoming = state.ringingCalls.find((call) => call.startedById !== state.me.id);
  const outgoing = state.ringingCalls.find((call) => call.startedById === state.me.id);
  const active = state.activeCalls[0];

  async function run(
    fn: (fd: FormData) => Promise<{ error?: string; ticketId?: string | null }>,
    id: string,
    ticketId?: string | null,
  ) {
    const fd = new FormData();
    fd.set("id", id);
    const result = await fn(fd);
    if (ticketId || result.ticketId) setSelectedId(ticketId ?? result.ticketId ?? null);
    await refresh();
  }

  if (incoming) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Phone className="animate-pulse" size={22} />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Chamada ao vivo</div>
              <div className="font-display text-2xl">
                {state.side === "PLATFORM" ? incoming.tenantName : "Suporte MegaBeauty"}
              </div>
              <p className="text-sm text-ink-soft">
                {incoming.startedByName} está chamando
                {state.side === "PLATFORM" ? " o suporte." : "."}
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button className="flex-1" variant="success" onClick={() => run(acceptSupportCall, incoming.id, incoming.ticketId)}>
              <Phone size={16} /> Atender
            </Button>
            <Button className="flex-1" variant="danger" onClick={() => run(declineSupportCall, incoming.id)}>
              <PhoneOff size={16} /> Recusar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (outgoing) {
    return (
      <div className="fixed right-4 bottom-4 z-40 w-full max-w-sm rounded-2xl border border-line bg-white p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <Radio className="animate-pulse" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {state.side === "PLATFORM" ? "Chamando o salão…" : "Chamando o suporte…"}
            </div>
            <p className="truncate text-xs text-ink-soft">{outgoing.tenantName}</p>
          </div>
          <Button variant="danger" className="h-9 px-3" onClick={() => run(endSupportCall, outgoing.id)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (active) {
    return (
      <div className="fixed right-4 bottom-4 z-40 w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Phone size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-emerald-950">Atendimento ao vivo</div>
            <p className="truncate text-xs text-emerald-800">{active.tenantName}</p>
          </div>
          <Button variant="danger" className="h-9 px-3" onClick={() => run(endSupportCall, active.id)}>
            Encerrar
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
