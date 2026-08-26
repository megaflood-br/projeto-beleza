import type { AppointmentStatus } from "@/lib/constants";

export type AgendaClient = {
  id: string;
  name: string;
  phone: string;
  birthDate: string | null;
  creditCents: number;
  cashbackCents: number;
  openComandas: number;
  packages: { name: string; remaining: number; priceCents: number }[];
};

export type AgendaService = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

export type AgendaProfessional = {
  id: string;
  name: string;
  color: string;
  specialty: string | null;
  workStart: string;
  workEnd: string;
};

export type AgendaAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  professionalId: string;
  comandaId: string | null;
  client: { id: string; name: string; phone: string };
  items: {
    serviceId: string;
    professionalId: string | null;
    startAt: string | null;
    durationMin: number;
    priceCents: number;
    service: { name: string; color: string };
  }[];
};
