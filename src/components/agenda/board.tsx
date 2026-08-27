"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentEditor } from "@/components/agenda/appointment-editor";
import type { AgendaAppointment, AgendaClient, AgendaProfessional, AgendaService } from "@/components/agenda/types";
import { Avatar, Badge } from "@/components/ui";
import { STATUS_COLOR, STATUS_LABEL, type AppointmentStatus } from "@/lib/constants";
import {
  buildSlots,
  formatDayLabel,
  formatTime,
  minutesInTz,
  parseHHmm,
  shiftCalendarDate,
} from "@/lib/dates";

const SLOT_H = 28;
const HEADER_H = 80;

type Placed = {
  appt: AgendaAppointment;
  start: Date;
  end: Date;
  top: number;
  height: number;
  lane: number;
  lanes: number;
};

function placeAppointments(
  items: AgendaAppointment[],
  openMin: number,
  closeMin: number,
  slotMinutes: number,
): Placed[] {
  const visible: Omit<Placed, "lane" | "lanes">[] = [];

  for (const appt of items) {
    const start = new Date(appt.startAt);
    const end = new Date(appt.endAt);
    const startMin = minutesInTz(start);
    const endMin = Math.max(startMin + slotMinutes, minutesInTz(end));
    const clippedStart = Math.max(startMin, openMin);
    const clippedEnd = Math.min(endMin, closeMin);
    if (clippedEnd <= clippedStart) continue;
    visible.push({
      appt,
      start,
      end,
      top: ((clippedStart - openMin) / slotMinutes) * SLOT_H,
      height: Math.max(SLOT_H, ((clippedEnd - clippedStart) / slotMinutes) * SLOT_H),
    });
  }

  const sorted = visible.sort((a, b) => a.top - b.top || b.height - a.height);
  const laneEnds: number[] = [];
  const withLane = sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.top + 0.5);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(item.top + item.height);
    } else {
      laneEnds[lane] = item.top + item.height;
    }
    return { ...item, lane, lanes: 1 };
  });

  return withLane.map((item) => {
    const overlapping = withLane.filter(
      (other) => other.top < item.top + item.height - 0.5 && other.top + other.height > item.top + 0.5,
    );
    const lanes = Math.max(...overlapping.map((o) => o.lane), item.lane) + 1;
    return { ...item, lanes };
  });
}

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
  const slots = useMemo(() => buildSlots(openTime, closeTime, slotMinutes), [openTime, closeTime, slotMinutes]);
  const [draft, setDraft] = useState<{ professionalId: string; time: string } | null>(null);
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);
  const openMin = parseHHmm(openTime);
  const closeMin = parseHHmm(closeTime);
  const gridHeight = slots.length * SLOT_H;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Agenda</h1>
          <p className="capitalize text-ink-soft">{formatDayLabel(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agenda?date=${shiftCalendarDate(date, -1)}`} className="rounded-full border border-line p-2">
            <ChevronLeft size={18} />
          </Link>
          <Link href="/agenda" className="rounded-full border border-line px-4 py-2 text-sm">
            Hoje
          </Link>
          <Link href={`/agenda?date=${shiftCalendarDate(date, 1)}`} className="rounded-full border border-line p-2">
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

      <div className="agenda-scroll max-h-[calc(100vh-13rem)] overflow-auto rounded-2xl border border-line bg-paper">
        <div
          className="grid w-max min-w-full"
          style={{
            gridTemplateColumns: `4rem repeat(${Math.max(professionals.length, 1)}, minmax(14rem, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-30 bg-sand">
            <div className="sticky top-0 z-30 border-b border-line bg-sand" style={{ height: HEADER_H }} />
            {slots.map((slot) => (
              <div key={slot} className="border-b border-line/70 px-1 text-[10px] text-ink-soft" style={{ height: SLOT_H }}>
                {slot.endsWith(":00") ? slot : ""}
              </div>
            ))}
          </div>
          {professionals.map((pro) => {
            const placed = placeAppointments(
              appointments.filter((a) => a.professionalId === pro.id),
              openMin,
              closeMin,
              slotMinutes,
            );
            return (
              <div key={pro.id} className="min-w-0 border-l border-line">
                <div
                  className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper px-3"
                  style={{ height: HEADER_H }}
                >
                  <Avatar name={pro.name} color={pro.color} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{pro.name.split(" ")[0]}</div>
                    <div className="truncate text-xs text-ink-soft">{pro.specialty}</div>
                  </div>
                </div>
                <div className="relative overflow-hidden" style={{ height: gridHeight }}>
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
                  {placed.map((item) => {
                    const service = item.appt.items[0]?.service;
                    const width = `calc((100% - 8px) / ${item.lanes})`;
                    const left = `calc(4px + ${item.lane} * (100% - 8px) / ${item.lanes})`;
                    return (
                      <button
                        key={item.appt.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(item.appt);
                        }}
                        className="absolute overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm"
                        style={{
                          top: item.top,
                          height: item.height,
                          left,
                          width,
                          background: STATUS_COLOR[item.appt.status],
                        }}
                      >
                        <div className="text-xs font-semibold leading-tight">{item.appt.client.name}</div>
                        <div className="text-[11px] opacity-90">{service?.name}</div>
                        <div className="text-[10px] opacity-80">
                          {formatTime(item.start)}–{formatTime(item.end)}
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
