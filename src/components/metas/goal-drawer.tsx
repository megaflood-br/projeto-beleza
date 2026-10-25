"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveProfessionalGoal } from "@/app/actions/goals";
import { GOAL_METRICS, goalMetricMeta } from "@/lib/goals";
import { formatBRL } from "@/lib/money";
import type { GoalProfessional, GoalRow } from "@/components/metas/types";

export function GoalDrawer({
  open,
  goal,
  professionals,
  defaultStart,
  defaultEnd,
  defaultProfessionalId,
  onClose,
}: {
  open: boolean;
  goal: GoalRow | null;
  professionals: GoalProfessional[];
  defaultStart: string;
  defaultEnd: string;
  defaultProfessionalId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [metric, setMetric] = useState(goal?.metric ?? "REVENUE");
  const unit = goalMetricMeta(metric).unit;

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await saveProfessionalGoal(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const defaultTarget =
    goal && unit === "money"
      ? formatBRL(goal.targetValue).replace("R$", "").trim()
      : goal
        ? String(goal.targetValue)
        : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <aside data-drawer="goal" className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{goal ? "Editar meta" : "Nova meta"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
          <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <Field label="Profissional" required>
              <Select name="professionalId" defaultValue={goal?.professionalId ?? defaultProfessionalId ?? professionals[0]?.id ?? ""}>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo da meta" required>
              <Select name="metric" value={metric} onChange={(event) => setMetric(event.target.value)}>
                {GOAL_METRICS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={unit === "money" ? "Valor (R$)" : "Quantidade"} required>
              <Input
                name="targetValue"
                required
                defaultValue={defaultTarget}
                placeholder={unit === "money" ? "8.000,00" : "20"}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início" required>
                <Input type="date" name="startDate" defaultValue={goal?.startDate ?? defaultStart} required />
              </Field>
              <Field label="Fim" required>
                <Input type="date" name="endDate" defaultValue={goal?.endDate ?? defaultEnd} required />
              </Field>
            </div>
            <Field label="Observação">
              <Textarea name="notes" defaultValue={goal?.notes ?? ""} placeholder="Opcional. Ex.: campanha de outubro." />
            </Field>
            {!goal ? (
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" name="applyAll" value="1" className="accent-blue-600" />
                Aplicar o mesmo valor a todos os profissionais ativos
              </label>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar meta"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
