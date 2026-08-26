"use client";

import { useMemo, useState, useTransition } from "react";
import { publicBook } from "@/app/actions/booking";
import { Button, Field, Input, Select } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { buildSlots } from "@/lib/dates";

type Service = { id: string; name: string; durationMin: number; priceCents: number };
type Professional = { id: string; name: string; color: string; serviceIds: string[] };
type Busy = { professionalId: string; startAt: string; endAt: string };

export function BookingWizard({
  slug,
  salon,
  services,
  professionals,
  busy,
  openTime,
  closeTime,
  slotMinutes,
}: {
  slug: string;
  salon: string;
  services: Service[];
  professionals: Professional[];
  busy: Busy[];
  openTime: string;
  closeTime: string;
  slotMinutes: number;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId);
  const pros = professionals.filter((p) => !serviceId || p.serviceIds.includes(serviceId) || p.serviceIds.length === 0);
  const slots = useMemo(() => buildSlots(openTime, closeTime, slotMinutes), [openTime, closeTime, slotMinutes]);

  const freeSlots = slots.filter((slot) => {
    if (!professionalId || !service) return false;
    const start = new Date(`${date}T${slot}:00`);
    const end = new Date(start.getTime() + service.durationMin * 60000);
    return !busy.some((b) => {
      if (b.professionalId !== professionalId) return false;
      const bs = new Date(b.startAt);
      const be = new Date(b.endAt);
      return start < be && end > bs;
    });
  });

  if (done) {
    return (
      <div className="rounded-3xl bg-paper p-8 text-center">
        <h2 className="font-display text-3xl">Horário reservado</h2>
        <p className="mt-2 text-ink-soft">O {salon} vai confirmar pelo WhatsApp. Até já!</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-3xl bg-paper p-6"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await publicBook(formData);
          if (result?.error) setError(result.error);
          else setDone(true);
        });
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="startAt" value={time ? new Date(`${date}T${time}:00`).toISOString() : ""} />
      <Field label="Serviço">
        <Select name="serviceId" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMin}min · {formatBRL(s.priceCents)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Profissional">
        <Select name="professionalId" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} required>
          <option value="">Escolha</option>
          {pros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Dia">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Horário">
        <Select value={time} onChange={(e) => setTime(e.target.value)} required>
          <option value="">Escolha um horário livre</option>
          {freeSlots.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Seu nome">
        <Input name="name" required />
      </Field>
      <Field label="WhatsApp">
        <Input name="phone" required placeholder="11999999999" />
      </Field>
      {error ? <p className="text-sm text-warn">{error}</p> : null}
      <Button disabled={pending || !time}>{pending ? "Reservando..." : "Confirmar agendamento"}</Button>
    </form>
  );
}
