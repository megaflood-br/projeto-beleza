"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentEditor } from "@/components/agenda/appointment-editor";
import type { AgendaAppointment, AgendaClient, AgendaProfessional, AgendaService } from "@/components/agenda/types";
import { Avatar, Badge } from "@/components/ui";
import { STATUS_COLOR, STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import { atTime, buildSlots, formatDateParam, formatDayLabel, formatTime } from "@/lib/dates";

const SLOT_H = 22;

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
  clients: AgendaClient[];
  services: AgendaService[];
}) {
  const day = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const slots = useMemo(() => buildSlots(openTime, closeTime, slotMinutes), [openTime, closeTime, slotMinutes]);
  const [draft, setDraft] = useState<{ professionalId: string; time: string } | null>(null);
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);
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
                      onClick={() => setDraft({ professionalId: pro.id, time: slot })}
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
        <AppointmentEditor
          mode="create"
          date={date}
          defaultProfessionalId={draft.professionalId}
          defaultTime={draft.time}
          appointment={null}
          clients={clients}
          professionals={professionals}
          services={services}
          slots={slots}
          onClose={() => setDraft(null)}
        />
      ) : null}

      {selected ? (
        <AppointmentEditor
          mode="edit"
          date={date}
          defaultProfessionalId={selected.professionalId}
          defaultTime={formatTime(new Date(selected.startAt))}
          appointment={selected}
          clients={clients}
          professionals={professionals}
          services={services}
          slots={slots}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
