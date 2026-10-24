"use client";

import { useEffect, useState } from "react";
import { QrCode, RefreshCw, Smartphone, Unplug } from "lucide-react";
import { Button } from "@/components/ui";
import { connectWhatsAppInstance, disconnectWhatsAppInstance } from "@/app/actions/whatsapp";
import type { WhatsAppLive } from "@/lib/whatsapp-live";
import { cn } from "@/lib/utils";

export function WhatsAppConnect({ initial }: { initial: WhatsAppLive }) {
  const [live, setLive] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initial.error);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const response = await fetch("/api/whatsapp/live", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const next = (await response.json()) as WhatsAppLive;
      if (!cancelled) {
        setLive(next);
        setError(next.error);
      }
    }
    void tick();
    const wait = live.state === "connecting" ? 2000 : 8000;
    const timer = window.setInterval(() => void tick(), wait);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [live.state]);

  async function connect() {
    setPending(true);
    setError(null);
    const result = await connectWhatsAppInstance();
    if (result && "error" in result && typeof result.error === "string") setError(result.error);
    if (result && "qr" in result && typeof result.qr === "string") {
      setLive((current) => ({ ...current, qr: result.qr, state: "connecting" }));
    }
    setPending(false);
  }

  async function disconnect() {
    setPending(true);
    setError(null);
    await disconnectWhatsAppInstance();
    setLive((current) => ({ ...current, state: "close", qr: null, number: null }));
    setPending(false);
  }

  const connected = live.state === "open";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl">Conexão WhatsApp</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Cada salão tem a própria instância. Escaneie o QR Code com o WhatsApp do estabelecimento.
        </p>
      </div>

      <div
        className={cn(
          "rounded-xl px-3 py-2 text-sm",
          connected ? "bg-emerald-50 text-emerald-800" : live.serverReady ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-ink-soft",
        )}
      >
        {!live.serverReady
          ? "Servidor Evolution ainda não foi configurado na plataforma."
          : connected
            ? `Conectado${live.number ? ` · ${live.number}` : ""}`
            : "Aguardando leitura do QR Code"}
      </div>

      {!live.serverReady ? (
        <p className="text-sm text-ink-soft">
          Peça ao administrador da plataforma para salvar a URL e a API key da Evolution em Integrações. O inbox continua em
          modo demonstração.
        </p>
      ) : connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Smartphone size={16} />
            Instância {live.instance}
          </div>
          <Button type="button" variant="danger" disabled={pending} onClick={disconnect}>
            <Unplug size={16} />
            Desconectar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {live.qr ? (
            <div className="rounded-2xl border border-line bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={live.qr} alt="QR Code do WhatsApp" className="mx-auto h-56 w-56" />
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-line text-ink-soft">
              <QrCode size={36} />
              <p className="mt-2 text-sm">Gere o QR Code para vincular este salão.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={connect}>
              <RefreshCw size={16} />
              {live.qr ? "Atualizar QR" : "Gerar QR Code"}
            </Button>
          </div>
        </div>
      )}

      {live.webhookUrl ? <p className="text-xs text-ink-soft">Webhook: {live.webhookUrl}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
