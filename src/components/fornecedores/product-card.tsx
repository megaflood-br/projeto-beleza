"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { ProductPhoto } from "@/components/fornecedores/product-photo";
import { formatBRL } from "@/lib/money";
import { formatStockQty } from "@/lib/stock";
import { cn } from "@/lib/utils";
import type { SupplierCatalogProduct } from "@/components/fornecedor/types";

export function CatalogProductCard({
  product,
  quantity,
  onAdd,
  onInc,
  onDec,
}: {
  product: SupplierCatalogProduct;
  quantity: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const inCart = quantity > 0;
  const delivery =
    product.deliveryFeeCents > 0
      ? `Entrega ${formatBRL(product.deliveryFeeCents)}`
      : "Entrega sem taxa";
  const min =
    product.deliveryMinCents > 0 ? ` a partir de ${formatBRL(product.deliveryMinCents)}` : "";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <div className="relative aspect-square border-b border-slate-100 bg-white p-3">
        <ProductPhoto src={product.imageUrl} alt={product.name} className="h-full w-full" iconSize={48} />
        {product.promo ? (
          <span className="absolute top-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            {product.promo.label}
          </span>
        ) : product.category ? (
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-ink-soft shadow-sm">
            {product.category}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm leading-snug text-slate-800">{product.name}</h3>
        {product.brand ? <p className="text-xs text-ink-soft">{product.brand}</p> : null}
        <div>
          {product.promo && product.promo.dealType !== "BUNDLE" && product.promo.priceCents < product.priceCents ? (
            <div className="text-xs text-ink-soft line-through">{formatBRL(product.priceCents)}</div>
          ) : null}
          <div className="text-2xl leading-none font-light tracking-tight text-slate-900">
            {formatBRL(product.promo && product.promo.dealType !== "BUNDLE" ? product.promo.priceCents : product.priceCents)}
          </div>
          {product.promo?.dealType === "BUNDLE" ? <p className="mt-1 text-xs font-medium text-rose-700">{product.promo.label}</p> : null}
        </div>
        <p className="text-xs font-medium text-emerald-600">
          {delivery}
          {min}
        </p>
        <p className="text-xs text-ink-soft">
          por {product.supplierName}
          {product.supplierCity ? ` · ${product.supplierCity}` : ""}
        </p>
        <p className="text-xs text-ink-soft">
          {product.stock == null ? "Pronta entrega" : formatStockQty(product.stock, product.unit)}
          {product.minQty > 1 ? ` · mín. ${formatStockQty(product.minQty, product.unit)}` : ""}
        </p>
        <div className="mt-auto pt-1">
          {inCart ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-1 py-1">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md text-blue-700 hover:bg-white"
                onClick={onDec}
                aria-label="Diminuir"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-8 text-center text-sm font-semibold text-blue-800">{quantity}</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md text-blue-700 hover:bg-white"
                onClick={onInc}
                aria-label="Aumentar"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#3483fa] text-sm font-medium text-white",
                "hover:bg-[#2968c8]",
              )}
            >
              <ShoppingCart size={16} />
              Adicionar ao carrinho
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
