import type { GoalStatus } from "@/lib/goals";

export type GoalProfessional = {
  id: string;
  name: string;
  nickname: string | null;
  color: string;
  specialty: string | null;
  active: boolean;
};

export type GoalRow = {
  id: string;
  professionalId: string;
  metric: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  current: number;
  remaining: number;
  pct: number;
  status: GoalStatus;
};

export type GoalCard = GoalProfessional & {
  goals: GoalRow[];
};
