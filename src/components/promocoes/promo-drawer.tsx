"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { savePromotion } from "@/app/actions/promotions";
import { WEEKDAYS } from "@/lib/promotions";
import { formatBRL } from "@/lib/money";
import type { PromotionRow } from "@/components/promocoes/types";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function PromoDrawer({
  open,
  promo,
  services,
  products,
  onClose,
}: {
  open: boolean;
  promo: PromotionRow | null;
  services: { id: string; name: string; priceCents: number }[];
  products: { id: string; name: string; priceCents: number }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [discountType, setDiscountType] = useState(promo?.discountType ?? "PERCENT");
  const [items, setItems] = useState<{ type: string; id: string }[]>(
    promo?.items.map((item) => ({ type: item.type, id: item.id })) ?? [{ type: "SERVICE", id: "" }],
  );

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await savePromotion(formData);
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
      <aside data-drawer="promo" className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{promo ? "Editar promoção" : "Nova promoção"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {promo ? <input type="hidden" name="id" value={promo.id} /> : null}
          <div className="grid flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <Field label="Nome" required>
              <Input name="name" defaultValue={promo?.name ?? ""} placeholder="Terça da escova" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início" required>
                <Input name="startsOn" type="date" defaultValue={promo?.startsOn ?? ""} />
              </Field>
              <Field label="Fim" required>
                <Input name="endsOn" type="date" defaultValue={promo?.endsOn ?? ""} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Dias da semana</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <label key={day.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="weekday"
                      value={day.id}
                      defaultChecked={promo ? promo.weekdays.includes(day.id) : true}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desconto">
                <Select name="discountType" value={discountType} onChange={(event) => setDiscountType(event.target.value === "CENTS" ? "CENTS" : "PERCENT")}>
                  <option value="PERCENT">Porcentagem</option>
                  <option value="CENTS">Reais</option>
                </Select>
              </Field>
              <Field label={discountType === "CENTS" ? "Valor (R$)" : "Percentual"}>
                <Input
                  name="discountValue"
                  defaultValue={
                    promo
                      ? promo.discountType === "CENTS"
                        ? centsToInput(promo.discountValue)
                        : String(promo.discountValue)
                      : discountType === "CENTS"
                        ? "10,00"
                        : "20"
                  }
                />
              </Field>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Itens da promoção</p>
              {items.map((row, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[120px_1fr]">
                  <Select
                    value={row.type}
                    onChange={(event) =>
                      setItems((current) => current.map((item, i) => (i === index ? { type: event.target.value, id: "" } : item)))
                    }
                  >
                    <option value="SERVICE">Serviço</option>
                    <option value="PRODUCT">Produto</option>
                  </Select>
                  <input type="hidden" name="itemType" value={row.type} />
                  <SearchSelect
                    name="itemId"
                    value={row.id}
                    onChange={(id) => setItems((current) => current.map((item, i) => (i === index ? { ...item, id } : item)))}
                    placeholder={row.type === "PRODUCT" ? "Buscar produto..." : "Buscar serviço..."}
                    options={(row.type === "PRODUCT" ? products : services).map((item) => ({
                      value: item.id,
                      label: item.name,
                      hint: formatBRL(item.priceCents),
                    }))}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, { type: "SERVICE", id: "" }])}>
                <Plus size={16} />
                Adicionar item
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" value="1" defaultChecked={promo?.active ?? true} />
              Promoção ativa
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
