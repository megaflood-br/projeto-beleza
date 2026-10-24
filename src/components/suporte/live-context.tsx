"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LIVE_CALL_POLL_MS, LIVE_POLL_MS } from "@/lib/support";
import type { SupportLiveState } from "@/components/suporte/types";

type SupportLiveContextValue = {
  state: SupportLiveState | null;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  refresh: () => Promise<void>;
};

const SupportLiveContext = createContext<SupportLiveContextValue | null>(null);

export function SupportLiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SupportLiveState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const refresh = useCallback(async () => {
    const ticket = selectedRef.current ? `?ticket=${encodeURIComponent(selectedRef.current)}` : "";
    const response = await fetch(`/api/support/live${ticket}`, { cache: "no-store" });
    if (!response.ok) return;
    const next = (await response.json()) as SupportLiveState;
    setState(next);
    if (!selectedRef.current && next.ticket?.id) {
      selectedRef.current = next.ticket.id;
      setSelectedId(next.ticket.id);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    void tick();
    const ringing = Boolean(state?.ringingCalls.length || state?.activeCalls.length);
    const timer = window.setInterval(() => void tick(), ringing ? LIVE_CALL_POLL_MS : LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refresh, state?.ringingCalls.length, state?.activeCalls.length, selectedId]);

  const value = useMemo(
    () => ({ state, selectedId, setSelectedId, refresh }),
    [state, selectedId, refresh],
  );

  return <SupportLiveContext.Provider value={value}>{children}</SupportLiveContext.Provider>;
}

export function useSupportLive() {
  const value = useContext(SupportLiveContext);
  if (!value) throw new Error("useSupportLive precisa do SupportLiveProvider");
  return value;
}

export function useSupportLiveOptional() {
  return useContext(SupportLiveContext);
}
