"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveSupplierProduct } from "@/app/actions/supplier-catalog";
import { formatBRL } from "@/lib/money";
import { STOCK_UNITS } from "@/lib/constants";
import type { SupplierProductRow } from "@/components/fornecedor/types";

export function SupplierProductDrawer({
  product,
  onClose,
}: {
  product?: SupplierProductRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(product?.active ?? true);

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("active", active ? "1" : "0");
    try {
      const result = await saveSupplierProduct(formData);
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
          <h2 className="text-lg font-semibold">{product?.id ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {product?.id ? <input type="hidden" name="id" value={product.id} /> : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid content-start gap-3">
              <Field label="Nome" required>
                <Input name="name" required defaultValue={product?.name ?? ""} placeholder="Ex.: Máscara hidratação 500ml" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca">
                  <Input name="brand" defaultValue={product?.brand ?? ""} />
                </Field>
                <Field label="SKU">
                  <Input name="sku" defaultValue={product?.sku ?? ""} />
                </Field>
              </div>
              <Field label="Categoria">
                <Input name="category" defaultValue={product?.category ?? ""} placeholder="Ex.: Coloração" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unidade">
                  <Select name="unit" defaultValue={product?.unit ?? "un"}>
                    {STOCK_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Preço" required>
                  <Input name="price" required placeholder="R$ 0,00" defaultValue={product ? formatBRL(product.priceCents).replace("R$", "").trim() : ""} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qtd. mínima">
                  <Input name="minQty" defaultValue={product?.minQty ?? 1} />
                </Field>
                <Field label="Estoque">
                  <Input name="stock" defaultValue={product?.stock ?? ""} placeholder="Vazio = ilimitado" />
                </Field>
              </div>
              <Field label="Descrição">
                <Textarea name="description" defaultValue={product?.description ?? ""} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-blue-600" />
                Visível para os salões
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
