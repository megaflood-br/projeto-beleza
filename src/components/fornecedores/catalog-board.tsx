"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button, Card, Input, Select } from "@/components/ui";
import { placeSupplierOrder } from "@/app/actions/supplier-orders";
import { SupplierOrdersBoard } from "@/components/fornecedor/orders-board";
import { formatBRL } from "@/lib/money";
import { formatStockQty } from "@/lib/stock";
import { cn } from "@/lib/utils";
import {
  SUPPLIER_FULFILLMENT_LABEL,
  SUPPLIER_PAY_METHOD_LABEL,
  asSupplierPayMethod,
  orderLineCents,
  quoteSupplierFulfillment,
} from "@/lib/supplier-market";
import type { SupplierCatalogProduct, SupplierOrderRow } from "@/components/fornecedor/types";

type CartLine = {
  productId: string;
  supplierId: string;
  supplierName: string;
  name: string;
  unit: string;
  unitCents: number;
  quantity: number;
};

type CheckoutChoice = {
  fulfillment: "PICKUP" | "DELIVERY";
  payment: string;
  notes: string;
};

function defaultChoice(product: SupplierCatalogProduct): CheckoutChoice {
  return {
    fulfillment: "PICKUP",
    payment: product.payMethods[0] ?? "PIX",
    notes: "",
  };
}

export function SalonSupplierBoard({
  products,
  orders,
}: {
  products: SupplierCatalogProduct[];
  orders: SupplierOrderRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"catalogo" | "pedidos">("catalogo");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [choices, setChoices] = useState<Record<string, CheckoutChoice>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

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
    const map = new Map<string, { id: string; name: string; city: string | null; sample: SupplierCatalogProduct; products: SupplierCatalogProduct[] }>();
    for (const product of visible) {
      const group = map.get(product.supplierId) ?? {
        id: product.supplierId,
        name: product.supplierName,
        city: product.supplierCity,
        sample: product,
        products: [],
      };
      group.products.push(product);
      map.set(product.supplierId, group);
    }
    return [...map.values()];
  }, [visible]);

  const cartGroups = useMemo(() => {
    const map = new Map<
      string,
      { supplierId: string; supplierName: string; sample: SupplierCatalogProduct | undefined; lines: CartLine[]; subtotalCents: number }
    >();
    for (const line of cart) {
      const sample = catalogById.get(line.productId);
      const group = map.get(line.supplierId) ?? {
        supplierId: line.supplierId,
        supplierName: line.supplierName,
        sample,
        lines: [],
        subtotalCents: 0,
      };
      group.lines.push(line);
      group.subtotalCents += orderLineCents(line.quantity, line.unitCents);
      if (!group.sample && sample) group.sample = sample;
      map.set(line.supplierId, group);
    }
    return [...map.values()];
  }, [cart, catalogById]);

  function choiceOf(supplierId: string, sample?: SupplierCatalogProduct): CheckoutChoice {
    return choices[supplierId] ?? (sample ? defaultChoice(sample) : { fulfillment: "PICKUP", payment: "PIX", notes: "" });
  }

  function setChoice(supplierId: string, sample: SupplierCatalogProduct | undefined, patch: Partial<CheckoutChoice>) {
    setChoices((current) => ({
      ...current,
      [supplierId]: { ...choiceOf(supplierId, sample), ...patch },
    }));
  }

  function qtyOf(productId: string, fallback: number) {
    return cart.find((line) => line.productId === productId)?.quantity ?? fallback;
  }

  function setQty(product: SupplierCatalogProduct, raw: string) {
    const quantity = Math.max(Number(raw.replace(",", ".")) || product.minQty, product.minQty);
    setCart((list) => {
      const rest = list.filter((line) => line.productId !== product.id);
      return [
        ...rest,
        {
          productId: product.id,
          supplierId: product.supplierId,
          supplierName: product.supplierName,
          name: product.name,
          unit: product.unit,
          unitCents: product.priceCents,
          quantity,
        },
      ];
    });
    setChoices((current) => (current[product.supplierId] ? current : { ...current, [product.supplierId]: defaultChoice(product) }));
  }

  function add(product: SupplierCatalogProduct) {
    setQty(product, String(qtyOf(product.id, product.minQty)));
  }

  function remove(productId: string) {
    setCart((list) => list.filter((line) => line.productId !== productId));
  }

  const quotes = cartGroups.map((group) => {
    const choice = choiceOf(group.supplierId, group.sample);
    return {
      supplierId: group.supplierId,
      quote: quoteSupplierFulfillment({
        subtotalCents: group.subtotalCents,
        fulfillment: choice.fulfillment,
        deliveryMinCents: group.sample?.deliveryMinCents ?? 0,
        deliveryFeeCents: group.sample?.deliveryFeeCents ?? 0,
      }),
    };
  });
  const blocked = quotes.some((item) => !item.quote.ok);
  const grandTotal = quotes.reduce((sum, item) => sum + item.quote.totalCents, 0);

  async function submit() {
    if (!cart.length || blocked) return;
    setError(null);
    setPending(true);
    const fd = new FormData();
    for (const line of cart) {
      fd.append("productId", line.productId);
      fd.append("quantity", String(line.quantity));
    }
    for (const group of cartGroups) {
      const choice = choiceOf(group.supplierId, group.sample);
      fd.set(`fulfillment_${group.supplierId}`, choice.fulfillment);
      fd.set(`payment_${group.supplierId}`, choice.payment);
      if (choice.notes) fd.set(`notes_${group.supplierId}`, choice.notes);
    }
    try {
      const result = await placeSupplierOrder(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setCart([]);
      setChoices({});
      setTab("pedidos");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Fornecedores</h1>
        <p className="mt-1 text-sm text-ink-soft">Peça agora e pague na retirada ou na entrega, direto com o fornecedor.</p>
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
        <SupplierOrdersBoard orders={orders} actor="salon" embedded />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                    <div className="mt-1 text-xs text-ink-soft">
                      {supplier.sample.deliveryMinCents > 0
                        ? `Entrega a partir de ${formatBRL(supplier.sample.deliveryMinCents)}`
                        : "Entrega sem mínimo"}
                      {supplier.sample.deliveryFeeCents > 0 ? ` · Taxa ${formatBRL(supplier.sample.deliveryFeeCents)}` : " · Sem taxa"}
                    </div>
                    <div className="text-xs text-ink-soft">
                      Aceita {supplier.sample.payMethods.map((method) => SUPPLIER_PAY_METHOD_LABEL[asSupplierPayMethod(method) ?? "PIX"]).join(", ")} no ato
                    </div>
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
              <div className="space-y-4">
                {cartGroups.map((group) => {
                  const choice = choiceOf(group.supplierId, group.sample);
                  const quote = quoteSupplierFulfillment({
                    subtotalCents: group.subtotalCents,
                    fulfillment: choice.fulfillment,
                    deliveryMinCents: group.sample?.deliveryMinCents ?? 0,
                    deliveryFeeCents: group.sample?.deliveryFeeCents ?? 0,
                  });
                  const methods = group.sample?.payMethods.length ? group.sample.payMethods : ["PIX", "CASH"];
                  return (
                    <div key={group.supplierId} className="space-y-2 border-b border-line pb-3 last:border-0 last:pb-0">
                      <div className="text-sm font-medium">{group.supplierName}</div>
                      <ul className="space-y-2 text-sm">
                        {group.lines.map((line) => (
                          <li key={line.productId} className="flex justify-between gap-2">
                            <span>
                              {line.name}
                              <span className="block text-xs text-ink-soft">{formatStockQty(line.quantity, line.unit)}</span>
                              <button type="button" className="text-xs text-red-600" onClick={() => remove(line.productId)}>
                                Remover
                              </button>
                            </span>
                            <span>{formatBRL(orderLineCents(line.quantity, line.unitCents))}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="grid grid-cols-2 gap-2">
                        {(["PICKUP", "DELIVERY"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setChoice(group.supplierId, group.sample, { fulfillment: mode })}
                            className={cn(
                              "rounded-lg border px-2 py-2 text-xs",
                              choice.fulfillment === mode ? "border-blue-600 bg-blue-50 text-blue-700" : "border-line text-ink-soft",
                            )}
                          >
                            {SUPPLIER_FULFILLMENT_LABEL[mode]}
                          </button>
                        ))}
                      </div>
                      {choice.fulfillment === "DELIVERY" ? (
                        <p className="text-xs text-ink-soft">
                          {group.sample?.deliveryMinCents
                            ? `Mínimo ${formatBRL(group.sample.deliveryMinCents)}`
                            : "Sem valor mínimo"}
                          {group.sample?.deliveryFeeCents ? ` · Taxa ${formatBRL(group.sample.deliveryFeeCents)}` : ""}
                          . Pagamento na entrega, com o fornecedor.
                        </p>
                      ) : (
                        <p className="text-xs text-ink-soft">
                          Retire com a nota e o código. Pagamento no ato, com o fornecedor
                          {group.sample?.supplierAddress ? ` · ${group.sample.supplierAddress}` : ""}.
                        </p>
                      )}
                      <Select
                        value={choice.payment}
                        onChange={(e) => setChoice(group.supplierId, group.sample, { payment: e.target.value })}
                      >
                        {methods.map((method) => {
                          const key = asSupplierPayMethod(method) ?? "PIX";
                          return (
                            <option key={method} value={method}>
                              {SUPPLIER_PAY_METHOD_LABEL[key]}
                            </option>
                          );
                        })}
                      </Select>
                      <Input
                        value={choice.notes}
                        onChange={(e) => setChoice(group.supplierId, group.sample, { notes: e.target.value })}
                        placeholder="Observação (opcional)"
                      />
                      {quote.ok ? (
                        <div className="space-y-1 text-sm">
                          {quote.feeCents > 0 ? (
                            <div className="flex justify-between text-ink-soft">
                              <span>Taxa de entrega</span>
                              <span>{formatBRL(quote.feeCents)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between font-medium">
                            <span>A pagar no ato</span>
                            <span>{formatBRL(quote.totalCents)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">{quote.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            {cartGroups.length > 1 ? (
              <div className="mt-3 flex items-center justify-between font-medium">
                <span>Total</span>
                <span>{formatBRL(grandTotal)}</span>
              </div>
            ) : null}
            <Button className="mt-3 w-full" disabled={pending || cart.length === 0 || blocked} onClick={() => void submit()}>
              {pending ? "Enviando..." : "Enviar pedido"}
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
