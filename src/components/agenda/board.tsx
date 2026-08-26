"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { addDays, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createAppointment, updateAppointmentStatus } from "@/app/actions/appointments";
import { Avatar, Badge, Button, Field, Select, Textarea } from "@/components/ui";
import { STATUS_COLOR, STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { atTime, buildSlots, formatDateParam, formatDayLabel, formatTime } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

const SLOT_H = 22;

export type AgendaAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  professionalId: string;
  client: { id: string; name: string; phone: string };
  items: { durationMin: number; priceCents: number; service: { name: string; color: string } }[];
};

export type AgendaProfessional = {
  id: string;
  name: string;
  color: string;
  specialty: string | null;
  workStart: string;
  workEnd: string;
};

export function AgendaBoard({
  date,
  openTime,
  closeTime,
  slotMinutes,
  professionals,
  appointments,
  clients,
  services,
}: {
  date: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  professionals: AgendaProfessional[];
  appointments: AgendaAppointment[];
  clients: { id: string; name: string }[];
  services: { id: string; name: string; durationMin: number; priceCents: number }[];
}) {
  const day = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const slots = useMemo(() => buildSlots(openTime, closeTime, slotMinutes), [openTime, closeTime, slotMinutes]);
  const [draft, setDraft] = useState<{ professionalId: string; startAt: string } | null>(null);
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dayStart = atTime(day, openTime);

  function pos(start: Date, end: Date) {
    const top = (differenceInMinutes(start, dayStart) / slotMinutes) * SLOT_H;
    const height = Math.max(SLOT_H * 2, (differenceInMinutes(end, start) / slotMinutes) * SLOT_H);
    return { top, height };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Agenda</h1>
          <p className="capitalize text-ink-soft">{formatDayLabel(day)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agenda?date=${formatDateParam(addDays(day, -1))}`} className="rounded-full border border-line p-2">
            <ChevronLeft size={18} />
          </Link>
          <Link href="/agenda" className="rounded-full border border-line px-4 py-2 text-sm">
            Hoje
          </Link>
          <Link href={`/agenda?date=${formatDateParam(addDays(day, 1))}`} className="rounded-full border border-line p-2">
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <Badge key={key} color={STATUS_COLOR[key as AppointmentStatus]}>
            {label}
          </Badge>
        ))}
      </div>

      <div className="agenda-scroll overflow-auto rounded-2xl border border-line bg-paper">
        <div className="flex min-w-max">
          <div className="sticky left-0 z-10 w-16 shrink-0 bg-sand">
            <div className="h-20 border-b border-line" />
            {slots.map((slot) => (
              <div key={slot} className="border-b border-line/70 px-1 text-[10px] text-ink-soft" style={{ height: SLOT_H }}>
                {slot.endsWith(":00") ? slot : ""}
              </div>
            ))}
          </div>
          {professionals.map((pro) => {
            const items = appointments.filter((a) => a.professionalId === pro.id);
            return (
              <div key={pro.id} className="relative w-56 shrink-0 border-l border-line">
                <div className="flex h-20 items-center gap-3 border-b border-line px-3">
                  <Avatar name={pro.name} color={pro.color} />
                  <div>
                    <div className="text-sm font-semibold">{pro.name.split(" ")[0]}</div>
                    <div className="text-xs text-ink-soft">{pro.specialty}</div>
                  </div>
                </div>
                <div className="relative" style={{ height: slots.length * SLOT_H }}>
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        setDraft({
                          professionalId: pro.id,
                          startAt: `${date}T${slot}`,
                        })
                      }
                      className="block w-full border-b border-dashed border-line/80 hover:bg-gold-soft/40"
                      style={{ height: SLOT_H }}
                      aria-label={`Novo horário ${slot} com ${pro.name}`}
                    />
                  ))}
                  {items.map((appt) => {
                    const start = new Date(appt.startAt);
                    const end = new Date(appt.endAt);
                    const { top, height } = pos(start, end);
                    const service = appt.items[0]?.service;
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(appt);
                        }}
                        className="absolute left-1 right-1 overflow-hidden rounded-xl p-2 text-left text-white shadow-sm"
                        style={{
                          top,
                          height,
                          background: STATUS_COLOR[appt.status],
                        }}
                      >
                        <div className="text-xs font-semibold leading-tight">{appt.client.name}</div>
                        <div className="text-[11px] opacity-90">{service?.name}</div>
                        <div className="text-[10px] opacity-80">
                          {formatTime(start)}–{formatTime(end)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {draft ? (
        <Modal title="Novo agendamento" onClose={() => setDraft(null)}>
          <form
            className="grid gap-3"
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const result = await createAppointment(formData);
                if (result?.error) setError(result.error);
                else setDraft(null);
              });
            }}
          >
            <input type="hidden" name="professionalId" value={draft.professionalId} />
            <input type="hidden" name="startAt" value={new Date(draft.startAt).toISOString()} />
            <Field label="Cliente">
              <Select name="clientId" required>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Serviço">
              <Select name="serviceId" required>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMin}min · {formatBRL(s.priceCents)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Observação">
              <Textarea name="notes" placeholder="Preferências, alergias..." />
            </Field>
            {error ? <p className="text-sm text-warn">{error}</p> : null}
            <Button disabled={pending}>{pending ? "Salvando..." : "Agendar"}</Button>
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <Modal title={selected.client.name} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            <div>{selected.items.map((i) => i.service.name).join(", ")}</div>
            <div className="text-ink-soft">
              {formatTime(new Date(selected.startAt))} – {formatTime(new Date(selected.endAt))}
            </div>
            <Badge color={STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
            <div className="flex flex-wrap gap-2 pt-2">
              {(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as AppointmentStatus[]).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant="outline"
                  className={cn("text-xs", selected.status === status && "border-wine text-wine")}
                  onClick={() => {
                    startTransition(async () => {
                      await updateAppointmentStatus(selected.id, status);
                      setSelected(null);
                    });
                  }}
                >
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-paper p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="text-ink-soft">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
