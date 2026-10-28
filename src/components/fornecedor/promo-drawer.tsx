"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { saveSupplierPromotion } from "@/app/actions/supplier-promos";
import { WEEKDAYS } from "@/lib/promotions";
import { calendarDate } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { SupplierProductRow } from "@/components/fornecedor/types";
import type { SupplierPromoRule } from "@/lib/supplier-promo";

export function SupplierPromoDrawer({
  promo,
  products,
  onClose,
}: {
  promo?: SupplierPromoRule | null;
  products: SupplierProductRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dealType, setDealType] = useState(promo?.dealType ?? "PERCENT");
  const [selected, setSelected] = useState<string[]>(promo?.productIds ?? []);
  const today = calendarDate();

  function toggle(id: string, on: boolean) {
    setSelected((list) => (on ? [...new Set([...list, id])] : list.filter((item) => item !== id)));
  }

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    for (const id of selected) formData.append("productId", id);
    try {
      const result = await saveSupplierPromotion(formData);
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg font-semibold">{promo?.id ? "Editar promoção" : "Nova promoção"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          {promo?.id ? <input type="hidden" name="id" value={promo.id} /> : null}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" required defaultValue={promo?.name ?? ""} placeholder="Ex.: Só hoje, leve 5 pague 3" />
            </Field>
            <Field label="Texto extra">
              <Input name="note" defaultValue={promo?.note ?? ""} placeholder="Aparece na vitrine do salão" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início" required>
                <Input name="startsOn" type="date" required defaultValue={promo?.startsOn ?? today} />
              </Field>
              <Field label="Fim" required>
                <Input name="endsOn" type="date" required defaultValue={promo?.endsOn ?? today} />
              </Field>
            </div>
            <p className="text-xs text-ink-soft">Para valer só hoje, deixe início e fim iguais a hoje.</p>
            <div>
              <div className="mb-2 text-sm font-medium text-ink-soft">Dias</div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <label key={day.id} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      name="weekday"
                      value={day.id}
                      defaultChecked={promo ? promo.weekdays.includes(day.id) : true}
                      className="accent-blue-600"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Tipo">
              <Select name="dealType" value={dealType} onChange={(e) => setDealType(e.target.value as typeof dealType)}>
                <option value="PERCENT">Porcentagem</option>
                <option value="CENTS">Valor fixo</option>
                <option value="BUNDLE">Leve X pague Y</option>
              </Select>
            </Field>
            {dealType === "BUNDLE" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Leve">
                  <Input name="buyQty" defaultValue={promo?.buyQty || 5} />
                </Field>
                <Field label="Pague">
                  <Input name="payQty" defaultValue={promo?.payQty || 3} />
                </Field>
              </div>
            ) : (
              <Field label={dealType === "CENTS" ? "Desconto" : "Desconto %"}>
                <Input
                  name="discountValue"
                  defaultValue={
                    promo && promo.dealType === "CENTS" ? formatBRL(promo.discountValue).replace("R$", "").trim() : promo?.discountValue || ""
                  }
                  placeholder={dealType === "CENTS" ? "R$ 0,00" : "20"}
                />
              </Field>
            )}
            <div>
              <div className="mb-2 text-sm font-medium text-ink-soft">Produtos</div>
              <div className="grid max-h-48 gap-2 overflow-y-auto">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(product.id)}
                      onChange={(e) => toggle(product.id, e.target.checked)}
                      className="accent-blue-600"
                    />
                    {product.name}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" value="1" defaultChecked={promo?.active ?? true} className="accent-blue-600" />
              Promoção ativa
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <Button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
