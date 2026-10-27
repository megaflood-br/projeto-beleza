"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { placeSupplierOrder } from "@/app/actions/supplier-orders";
import { SupplierOrdersBoard } from "@/components/fornecedor/orders-board";
import { formatBRL } from "@/lib/money";
import { formatStockQty } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { orderLineCents, orderTotalCents } from "@/lib/supplier-market";
import type { SupplierOrderRow, SupplierProductRow } from "@/components/fornecedor/types";

type CatalogProduct = SupplierProductRow & { supplierId: string; supplierName: string; supplierCity: string | null };
type CartLine = { productId: string; supplierId: string; supplierName: string; name: string; unit: string; unitCents: number; quantity: number };

export function SalonSupplierBoard({
  products,
  orders,
}: {
  products: CatalogProduct[];
  orders: SupplierOrderRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"catalogo" | "pedidos">("catalogo");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (!q) return true;
      return [product.name, product.brand, product.category, product.supplierName].some((value) =>
        (value ?? "").toLowerCase().includes(q),
      );
    });
  }, [products, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; name: string; city: string | null; products: CatalogProduct[] }>();
    for (const product of visible) {
      const group = map.get(product.supplierId) ?? { id: product.supplierId, name: product.supplierName, city: product.supplierCity, products: [] };
      group.products.push(product);
      map.set(product.supplierId, group);
    }
    return [...map.values()];
  }, [visible]);

  function qtyOf(productId: string, fallback: number) {
    return cart.find((line) => line.productId === productId)?.quantity ?? fallback;
  }

  function setQty(product: CatalogProduct, raw: string) {
    const quantity = Math.max(Number(raw.replace(",", ".")) || product.minQty, product.minQty);
    setCart((list) => {
      const rest = list.filter((line) => line.productId !== product.id);
      return [...rest, { productId: product.id, supplierId: product.supplierId, supplierName: product.supplierName, name: product.name, unit: product.unit, unitCents: product.priceCents, quantity }];
    });
  }

  function add(product: CatalogProduct) {
    setQty(product, String(qtyOf(product.id, product.minQty)));
  }

  async function submit() {
    if (!cart.length) return;
    setError(null);
    setPending(true);
    const fd = new FormData();
    if (notes) fd.set("notes", notes);
    for (const line of cart) {
      fd.append("productId", line.productId);
      fd.append("quantity", String(line.quantity));
    }
    try {
      const result = await placeSupplierOrder(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setCart([]);
      setNotes("");
      setTab("pedidos");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const total = orderTotalCents(cart.map((line) => ({ lineCents: orderLineCents(line.quantity, line.unitCents) })));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Fornecedores</h1>
        <p className="mt-1 text-sm text-ink-soft">Peça produtos direto das empresas cadastradas na plataforma.</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {(
          [
            ["catalogo", "Catálogo"],
            ["pedidos", "Meus pedidos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm",
              tab === id ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pedidos" ? (
        <SupplierOrdersBoard orders={orders} actor="salon" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto, marca ou fornecedor" />
            {grouped.length === 0 ? (
              <Card>
                <p className="text-sm text-ink-soft">Nenhum produto à venda no momento.</p>
              </Card>
            ) : (
              grouped.map((supplier) => (
                <Card key={supplier.id} className="space-y-3">
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    {supplier.city ? <div className="text-xs text-ink-soft">{supplier.city}</div> : null}
                  </div>
                  <ul className="divide-y divide-line">
                    {supplier.products.map((product) => (
                      <li key={product.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-ink-soft">
                            {[product.brand, product.category, product.stock == null ? "Pronta entrega" : formatStockQty(product.stock, product.unit)].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="text-sm font-medium">{formatBRL(product.priceCents)}</div>
                        <Input
                          className="h-10 w-20"
                          value={qtyOf(product.id, product.minQty)}
                          onChange={(e) => setQty(product, e.target.value)}
                        />
                        <Button type="button" variant="outline" onClick={() => add(product)}>
                          Adicionar
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </div>
          <aside className="h-fit rounded-2xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <ShoppingCart size={16} />
              Pedido
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-ink-soft">Escolha produtos para montar o pedido.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {cart.map((line) => (
                  <li key={line.productId} className="flex justify-between gap-2">
                    <span>
                      {line.name}
                      <span className="block text-xs text-ink-soft">
                        {line.supplierName} · {formatStockQty(line.quantity, line.unit)}
                      </span>
                    </span>
                    <span>{formatBRL(orderLineCents(line.quantity, line.unitCents))}</span>
                  </li>
                ))}
              </ul>
            )}
            <Input className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observação (opcional)" />
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            <div className="mt-3 flex items-center justify-between font-medium">
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
            <Button className="mt-3 w-full" disabled={pending || cart.length === 0} onClick={() => void submit()}>
              {pending ? "Enviando..." : "Enviar pedido"}
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
