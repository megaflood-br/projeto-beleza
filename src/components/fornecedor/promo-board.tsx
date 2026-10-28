"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SupplierPromoDrawer } from "@/components/fornecedor/promo-drawer";
import { deleteSupplierPromotion } from "@/app/actions/supplier-promos";
import { formatShortDate } from "@/lib/dates";
import { supplierDealLabel, type SupplierPromoRule } from "@/lib/supplier-promo";
import { useConfirm } from "@/components/confirm-dialog";
import type { SupplierProductRow } from "@/components/fornecedor/types";

export function SupplierPromoBoard({
  promotions,
  products,
}: {
  promotions: SupplierPromoRule[];
  products: SupplierProductRow[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<SupplierPromoRule | null | undefined>(undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Promoções</h1>
          <p className="mt-1 text-sm text-ink-soft">Aparecem na vitrine dos salões da sua área, com prazo e regras.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Nova promoção
        </Button>
      </div>
      {promotions.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">Nenhuma promoção. Crie uma de um dia, tipo “leve 5 pague 3”.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul>
            {promotions.map((promo) => {
              const names = products.filter((product) => promo.productIds.includes(product.id)).map((product) => product.name);
              return (
                <li key={promo.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                  <div>
                    <div className="font-medium">{supplierDealLabel(promo)}</div>
                    <div className="text-xs text-ink-soft">
                      {formatShortDate(new Date(`${promo.startsOn}T12:00:00`))} — {formatShortDate(new Date(`${promo.endsOn}T12:00:00`))}
                      {names.length ? ` · ${names.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditing(promo)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        void confirm({
                          title: `Excluir a promoção ${promo.name}?`,
                          description: "Ela some da vitrine dos salões.",
                        }).then((ok) => {
                          if (!ok) return;
                          const form = new FormData();
                          form.set("id", promo.id);
                          void deleteSupplierPromotion(form).then(() => router.refresh());
                        });
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {editing !== undefined ? <SupplierPromoDrawer promo={editing} products={products} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
}
