"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SupplierProductDrawer } from "@/components/fornecedor/product-drawer";
import { ProductPhoto } from "@/components/fornecedores/product-photo";
import { formatBRL } from "@/lib/money";
import { formatStockQty } from "@/lib/stock";
import type { SupplierProductRow } from "@/components/fornecedor/types";

export function SupplierProductBoard({ products }: { products: SupplierProductRow[] }) {
  const [editing, setEditing] = useState<SupplierProductRow | null | undefined>(undefined);
  const visible = useMemo(() => products, [products]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-ink-soft">O que os salões podem pedir na plataforma.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">Nenhum produto ainda. Cadastre o primeiro para aparecer no catálogo dos salões.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-line px-4 py-2.5 text-sm font-medium text-ink-soft sm:grid-cols-[1fr_8rem_7rem_6rem]">
            <span>Produto</span>
            <span className="hidden sm:block">Estoque</span>
            <span className="hidden text-right sm:block">Preço</span>
            <span className="text-right">Status</span>
          </div>
          <ul>
            {visible.map((product) => (
              <li key={product.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => setEditing(product)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:grid-cols-[1fr_8rem_7rem_6rem]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ProductPhoto src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line" iconSize={18} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{product.name}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {[product.brand, product.category, product.sku].filter(Boolean).join(" · ") || "Sem detalhes"}
                      </span>
                      <span className="mt-1 block text-xs text-ink-soft sm:hidden">{formatBRL(product.priceCents)}</span>
                    </span>
                  </span>
                  <span className="hidden text-sm text-ink-soft sm:block">
                    {product.stock == null ? "Ilimitado" : formatStockQty(product.stock, product.unit)}
                  </span>
                  <span className="hidden text-right font-medium sm:block">{formatBRL(product.priceCents)}</span>
                  <span className={`text-right text-xs font-medium ${product.active ? "text-emerald-700" : "text-ink-soft"}`}>
                    {product.active ? "Visível" : "Oculto"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing !== undefined ? <SupplierProductDrawer product={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
}
