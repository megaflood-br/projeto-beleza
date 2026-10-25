"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { PromoDrawer } from "@/components/promocoes/promo-drawer";
import { deletePromotion } from "@/app/actions/promotions";
import { WEEKDAYS } from "@/lib/promotions";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { HeatDay, PromotionRow } from "@/components/promocoes/types";

export function PromoBoard({
  promotions,
  heat,
  services,
  products,
  canManage,
}: {
  promotions: PromotionRow[];
  heat: HeatDay[];
  services: { id: string; name: string; priceCents: number }[];
  products: { id: string; name: string; priceCents: number }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PromotionRow | null | undefined>(undefined);
  const weak = heat.filter((day) => day.weak).map((day) => day.label).join(" e ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Promoções</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Fidelize com desconto em serviço ou produto, por período e dia da semana. O valor entra na comanda e no agendamento online.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setEditing(null)}>
            <Plus size={16} />
            Nova promoção
          </Button>
        ) : null}
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-medium">Mapa de calor da semana</h2>
            <p className="text-sm text-ink-soft">
              Movimento das comandas fechadas nas últimas 8 semanas.
              {weak ? ` ${weak} é o dia mais fraco para promover.` : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {heat.map((day) => (
            <div key={day.id} className="text-center">
              <div className="flex h-24 items-end justify-center rounded-lg bg-sand px-1 pb-1">
                <div
                  className={cn("w-full rounded-md", day.weak ? "bg-amber-400" : "bg-blue-600")}
                  style={{ height: `${Math.max(8, Math.round(day.intensity * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-xs font-medium">{day.label}</div>
              <div className="text-[11px] text-ink-soft">{day.count}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {promotions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-ink-soft">
            <Tag size={28} />
            <p>Nenhuma promoção cadastrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3">Promoção</th>
                <th>Período</th>
                <th>Dias</th>
                <th>Desconto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo) => (
                <tr key={promo.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-medium">{promo.name}</div>
                    <div className="text-xs text-ink-soft">{promo.items.map((item) => item.name).join(", ")}</div>
                  </td>
                  <td>
                    {formatShortDate(new Date(`${promo.startsOn}T12:00:00`))} — {formatShortDate(new Date(`${promo.endsOn}T12:00:00`))}
                  </td>
                  <td>{promo.weekdays.map((day) => WEEKDAYS[day]?.label).join(" ")}</td>
                  <td>
                    {promo.discountType === "CENTS" ? formatBRL(promo.discountValue) : `${promo.discountValue}%`}
                    <div className="mt-1">
                      <Badge color={promo.active ? "#059669" : "#64748b"}>{promo.active ? "Ativa" : "Pausada"}</Badge>
                    </div>
                  </td>
                  <td className="px-4 text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <button type="button" className="text-sm font-medium text-wine" onClick={() => setEditing(promo)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-sm text-red-600"
                          onClick={() => {
                            const form = new FormData();
                            form.set("id", promo.id);
                            void deletePromotion(form).then(() => router.refresh());
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {canManage && editing !== undefined ? (
        <PromoDrawer
          open
          promo={editing}
          services={services}
          products={products}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}
