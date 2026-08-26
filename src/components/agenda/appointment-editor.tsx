"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2, X } from "lucide-react";
import { deleteAppointment, saveAppointment } from "@/app/actions/appointments";
import { createComandaFromAppointment } from "@/app/actions/comandas";
import { Button, Select } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { DURATION_OPTIONS, STATUS_COLOR, STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { formatTime, minutesToLabel } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { initials } from "@/lib/utils";
import type { AgendaAppointment, AgendaClient, AgendaProfessional, AgendaService } from "@/components/agenda/types";

type ItemRow = {
  key: string;
  serviceId: string;
  professionalId: string;
  time: string;
  durationMin: number;
};

function emptyRow(professionalId: string, time: string): ItemRow {
  return { key: Math.random().toString(36).slice(2), serviceId: "", professionalId, time, durationMin: 60 };
}

export function AppointmentEditor({
  mode,
  date,
  defaultProfessionalId,
  defaultTime,
  appointment,
  clients,
  professionals,
  services,
  slots,
  onClose,
}: {
  mode: "create" | "edit";
  date: string;
  defaultProfessionalId: string;
  defaultTime: string;
  appointment: AgendaAppointment | null;
  clients: AgendaClient[];
  professionals: AgendaProfessional[];
  services: AgendaService[];
  slots: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(appointment?.client.id ?? "");
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? "PENDING");
  const [apptDate, setApptDate] = useState(date);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [items, setItems] = useState<ItemRow[]>(() => {
    if (appointment?.items.length) {
      return appointment.items.map((item) => ({
        key: Math.random().toString(36).slice(2),
        serviceId: item.serviceId,
        professionalId: item.professionalId ?? appointment.professionalId,
        time: item.startAt ? formatTime(new Date(item.startAt)) : formatTime(new Date(appointment.startAt)),
        durationMin: item.durationMin,
      }));
    }
    return [emptyRow(defaultProfessionalId, defaultTime)];
  });

  const client = clients.find((c) => c.id === clientId);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setItems((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.serviceId) {
          const service = serviceById.get(patch.serviceId);
          if (service) next.durationMin = service.durationMin;
        }
        return next;
      }),
    );
  }

  function save(thenComanda: boolean) {
    setError(null);
    const payload = items.filter((item) => item.serviceId);
    startTransition(async () => {
      const result = await saveAppointment({
        id: appointment?.id,
        clientId,
        date: apptDate,
        status,
        items: payload,
      });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (thenComanda && result.ok) {
        const comanda = await createComandaFromAppointment(result.id);
        if ("error" in comanda && comanda.error) {
          setError(comanda.error);
          return;
        }
        if (comanda.ok) {
          router.push(`/comandas/${comanda.id}`);
          onClose();
          return;
        }
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-slate-50 p-5 md:flex">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wine text-xl font-semibold text-white">
              {initials(client?.name ?? "Cliente")}
            </div>
            <div className="mt-3 font-semibold">{client?.name ?? "Selecione o cliente"}</div>
            <div className="text-sm text-ink-soft">{client?.phone}</div>
            {client?.phone ? (
              <a
                href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white"
              >
                <MessageCircle size={16} /> Conversar
              </a>
            ) : null}
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="font-medium text-ink-soft">Informações</div>
            <p>Aniversário {client?.birthDate ? new Date(client.birthDate).toLocaleDateString("pt-BR") : "não definido"}</p>
            <p>{formatBRL(client?.cashbackCents ?? 0)} em cashback</p>
            <p>{formatBRL(client?.creditCents ?? 0)} em crédito</p>
            <p>
              {client?.openComandas ?? 0} comanda{(client?.openComandas ?? 0) === 1 ? "" : "s"} em aberto
            </p>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="font-medium text-ink-soft">Pacotes</div>
            {client?.packages.length ? (
              client.packages.map((pack) => (
                <p key={pack.name}>
                  {pack.name} · {pack.remaining} sessões · {formatBRL(pack.priceCents)}
                </p>
              ))
            ) : (
              <p className="text-ink-soft">Nenhum pacote ativo</p>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-lg font-semibold">{mode === "edit" ? "Editando agendamento" : "Novo agendamento"}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-medium text-ink-soft">Cliente</span>
                <SearchSelect
                  required
                  placeholder="Buscar cliente..."
                  value={clientId}
                  onChange={setClientId}
                  options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink-soft">Data</span>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="h-11 rounded-lg border border-line px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink-soft">Status</span>
                <Select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
                  {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-2 font-medium">Itens do agendamento</div>
              <div className="hidden grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_40px] gap-2 text-xs font-medium text-ink-soft md:grid">
                <span>Descrição</span>
                <span>Profissional</span>
                <span>Horário</span>
                <span>Duração</span>
                <span />
              </div>
              <div className="mt-2 space-y-2">
                {items.map((row) => (
                  <div key={row.key} className="grid gap-2 md:grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_40px]">
                    <SearchSelect
                      placeholder="Buscar serviço..."
                      value={row.serviceId}
                      onChange={(serviceId) => updateRow(row.key, { serviceId })}
                      options={services.map((s) => ({ value: s.id, label: s.name }))}
                    />
                    <SearchSelect
                      placeholder="Buscar profissional..."
                      value={row.professionalId}
                      onChange={(professionalId) => updateRow(row.key, { professionalId })}
                      options={professionals.map((p) => ({ value: p.id, label: p.name }))}
                    />
                    <Select value={row.time} onChange={(e) => updateRow(row.key, { time: e.target.value })}>
                      {slots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={String(row.durationMin)}
                      onChange={(e) => updateRow(row.key, { durationMin: Number(e.target.value) })}
                    >
                      {DURATION_OPTIONS.map((min) => (
                        <option key={min} value={min}>
                          {minutesToLabel(min)}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center text-red-600"
                      onClick={() => setItems((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.key !== row.key)))}
                      aria-label="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm font-medium text-wine"
                  onClick={() =>
                    setItems((rows) => [
                      ...rows,
                      emptyRow(
                        rows.at(-1)?.professionalId || defaultProfessionalId,
                        rows.at(-1)?.time || defaultTime,
                      ),
                    ])
                  }
                >
                  + Adicionar serviço
                </button>
              </div>
            </div>
            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {mode === "edit" && appointment ? (
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteAppointment(appointment.id);
                    if (result?.error) setError(result.error);
                    else onClose();
                  });
                }}
              >
                Excluir
              </Button>
            ) : null}
            <Button type="button" disabled={pending} onClick={() => save(false)}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="success" disabled={pending} onClick={() => save(true)}>
              {appointment?.comandaId ? "Abrir comanda" : "Criar comanda"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusDot({ status }: { status: AppointmentStatus }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[status] }} />;
}
