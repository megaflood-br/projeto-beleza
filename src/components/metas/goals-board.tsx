"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, Plus, Target } from "lucide-react";
import { Avatar, Button, Card } from "@/components/ui";
import { copyGoalsFromPreviousMonth, deleteProfessionalGoal } from "@/app/actions/goals";
import { formatMonthLabel, shiftCalendarMonth } from "@/lib/dates";
import { formatGoalValue, goalMetricMeta, summarizeGoalStatuses, type GoalStatus } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { GoalDrawer } from "@/components/metas/goal-drawer";
import { useConfirm } from "@/components/confirm-dialog";
import type { GoalCard, GoalProfessional, GoalRow } from "@/components/metas/types";

function statusTone(status: GoalStatus) {
  if (status === "hit") return "bg-emerald-500";
  if (status === "on_track") return "bg-blue-600";
  if (status === "behind") return "bg-amber-500";
  return "bg-slate-300";
}

function statusLabel(status: GoalStatus) {
  if (status === "hit") return "Batida";
  if (status === "on_track") return "No ritmo";
  if (status === "behind") return "Atrasada";
  return "Sem meta";
}

export function GoalsBoard({
  month,
  from,
  to,
  cards,
  professionals,
  canManage,
  pacePct,
}: {
  month: string;
  from: string;
  to: string;
  cards: GoalCard[];
  professionals: GoalProfessional[];
  canManage: boolean;
  pacePct: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ goal: GoalRow | null; professionalId?: string } | undefined>();
  const [copyError, setCopyError] = useState<string | null>(null);
  const prev = shiftCalendarMonth(month, -1);
  const next = shiftCalendarMonth(month, 1);
  const statuses = cards.flatMap((card) => card.goals.map((goal) => goal.status));
  const summary = summarizeGoalStatuses(statuses);

  const emptyPros = useMemo(() => cards.filter((card) => card.active && card.goals.length === 0), [cards]);

  async function copyPrevious() {
    setCopyError(null);
    const form = new FormData();
    form.set("month", month);
    form.set("fromMonth", prev);
    const result = await copyGoalsFromPreviousMonth(form);
    if (result && "error" in result && result.error) {
      setCopyError(result.error);
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Excluir esta meta?", description: "O progresso do mês some da lista deste profissional." }))) {
      return;
    }
    const form = new FormData();
    form.set("id", id);
    await deleteProfessionalGoal(form);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Metas</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Metas por profissional no mês. O progresso usa comandas fechadas atribuídas a cada um.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setEditing({ goal: null })}>
            <Plus size={16} />
            Nova meta
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/metas?month=${prev}`} className="rounded-lg border border-line p-2 hover:bg-sand" aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-48 text-center font-medium">{formatMonthLabel(month)}</div>
          <Link href={`/metas?month=${next}`} className="rounded-lg border border-line p-2 hover:bg-sand" aria-label="Próximo mês">
            <ChevronRight size={18} />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-800">{summary.hit} batidas</span>
          <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-800">{summary.onTrack} no ritmo</span>
          <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-900">{summary.behind} atrasadas</span>
          <span className="text-ink-soft">Ritmo esperado do mês: {pacePct}%</span>
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={copyPrevious}>
            <Copy size={16} />
            Copiar metas de {formatMonthLabel(prev)}
          </Button>
          {copyError ? <p className="text-sm text-red-600">{copyError}</p> : null}
        </div>
      ) : null}

      {cards.every((card) => card.goals.length === 0) ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Target size={32} className="text-ink-soft" />
          <div>
            <p className="font-medium">Nenhuma meta neste período</p>
            <p className="mt-1 text-sm text-ink-soft">
              Defina faturamento, atendimentos, produtos, comissão ou clientes para cada profissional.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={card.name} color={card.color} />
                  <div>
                    <div className="font-medium">{card.name}</div>
                    <div className="text-xs text-ink-soft">{card.specialty ?? card.nickname ?? "Profissional"}</div>
                  </div>
                </div>
                {canManage ? (
                  <Button type="button" variant="ghost" onClick={() => setEditing({ goal: null, professionalId: card.id })}>
                    <Plus size={14} />
                    Meta
                  </Button>
                ) : null}
              </div>

              {card.goals.length === 0 ? (
                <p className="text-sm text-ink-soft">Sem meta neste mês.</p>
              ) : (
                <ul className="space-y-3">
                  {card.goals.map((goal) => (
                    <li key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{goalMetricMeta(goal.metric).label}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", statusTone(goal.status), "text-white")}>
                          {statusLabel(goal.status)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", statusTone(goal.status))} style={{ width: `${Math.min(100, goal.pct)}%` }} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
                        <span>
                          {formatGoalValue(goal.metric, goal.current)} de {formatGoalValue(goal.metric, goal.targetValue)} · {goal.pct}%
                        </span>
                        {canManage ? (
                          <span className="flex gap-2">
                            <button type="button" className="hover:text-ink" onClick={() => setEditing({ goal })}>
                              Editar
                            </button>
                            <button type="button" className="hover:text-red-600" onClick={() => void remove(goal.id)}>
                              Excluir
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {emptyPros.length && cards.some((card) => card.goals.length) ? (
        <p className="text-xs text-ink-soft">
          Sem meta: {emptyPros.map((pro) => pro.name).join(", ")}.
        </p>
      ) : null}

      {canManage ? (
        <GoalDrawer
          key={editing?.goal?.id ?? editing?.professionalId ?? "new"}
          open={editing !== undefined}
          goal={editing?.goal ?? null}
          professionals={professionals}
          defaultStart={from}
          defaultEnd={to}
          defaultProfessionalId={editing?.professionalId}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}
