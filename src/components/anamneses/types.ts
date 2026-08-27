import type { AnamnesisArea, AnamnesisQuestion, AnamnesisStatus } from "@/lib/anamnesis";

export type AnamnesisFormRow = {
  id: string;
  name: string;
  slug: string;
  area: AnamnesisArea;
  description: string;
  questions: AnamnesisQuestion[];
  active: boolean;
  records: number;
};

export type AnamnesisRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  formId: string;
  formName: string;
  formArea: AnamnesisArea;
  professionalId: string | null;
  professionalName: string | null;
  status: AnamnesisStatus;
  answers: string;
  notes: string | null;
  signedName: string | null;
  signedAt: string | null;
  occurredAt: string;
  createdAt: string;
  alerts: string[];
};
