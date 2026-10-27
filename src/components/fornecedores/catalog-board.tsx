"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button, Card, Input, Select } from "@/components/ui";
import { placeSupplierOrder } from "@/app/actions/supplier-orders";
import { SupplierOrdersBoard } from "@/components/fornecedor/orders-board";
import { CatalogProductCard } from "@/components/fornecedores/product-card";
import { ProductPhoto } from "@/components/fornecedores/product-photo";
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
import { bundlePayableQty } from "@/lib/supplier-promo";
import { SupplierDealStrip, type SupplierDealCard } from "@/components/avisos/salon-alerts";
import type { SupplierCatalogProduct, SupplierOrderRow } from "@/components/fornecedor/types";

type CartLine = {
  productId: string;
  supplierId: string;
  supplierName: string;
  name: string;
  unit: string;
  unitCents: number;
  quantity: number;
  imageUrl: string | null;
};

type CheckoutChoice = {
  fulfillment: "PICKUP" | "DELIVERY";
  payment: string;
  notes: string;
};

function catalogLineCents(product: SupplierCatalogProduct | undefined, quantity: number, fallbackCents: number) {
  if (!product?.promo) return orderLineCents(quantity, fallbackCents);
  if (product.promo.dealType === "BUNDLE") {
    return orderLineCents(bundlePayableQty(quantity, product.promo.buyQty, product.promo.payQty), product.priceCents);
  }
  return orderLineCents(quantity, product.promo.priceCents);
}

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
  salonCity,
  initialQuery = "",
  deals = [],
}: {
  products: SupplierCatalogProduct[];
  orders: SupplierOrderRow[];
  salonCity?: string | null;
  initialQuery?: string;
  deals?: SupplierDealCard[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"catalogo" | "pedidos">("catalogo");
  const [query, setQuery] = useState(initialQuery);
  const [supplierId, setSupplierId] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [choices, setChoices] = useState<Record<string, CheckoutChoice>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const suppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const product of products) map.set(product.supplierId, { id: product.supplierId, name: product.supplierName });
    return [...map.values()];
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (supplierId !== "all" && product.supplierId !== supplierId) return false;
      if (!q) return true;
      return [product.name, product.brand, product.category, product.supplierName].some((value) =>
        (value ?? "").toLowerCase().includes(q),
      );
    });
  }, [products, query, supplierId]);

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
      group.subtotalCents += catalogLineCents(sample, line.quantity, line.unitCents);
      if (!group.sample && sample) group.sample = sample;
      map.set(line.supplierId, group);
    }
    return [...map.values()];
  }, [cart, catalogById]);

  function choiceOf(id: string, sample?: SupplierCatalogProduct): CheckoutChoice {
    return choices[id] ?? (sample ? defaultChoice(sample) : { fulfillment: "PICKUP", payment: "PIX", notes: "" });
  }

  function setChoice(id: string, sample: SupplierCatalogProduct | undefined, patch: Partial<CheckoutChoice>) {
    setChoices((current) => ({
      ...current,
      [id]: { ...choiceOf(id, sample), ...patch },
    }));
  }

  function qtyOf(productId: string) {
    return cart.find((line) => line.productId === productId)?.quantity ?? 0;
  }

  function put(product: SupplierCatalogProduct, quantity: number) {
    setCart((list) => {
      const rest = list.filter((line) => line.productId !== product.id);
      if (quantity <= 0) return rest;
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
          imageUrl: product.imageUrl,
        },
      ];
    });
    setChoices((current) => (current[product.supplierId] ? current : { ...current, [product.supplierId]: defaultChoice(product) }));
  }

  function add(product: SupplierCatalogProduct) {
    const current = qtyOf(product.id);
    put(product, current === 0 ? product.minQty : current + 1);
  }

  function dec(product: SupplierCatalogProduct) {
    const current = qtyOf(product.id);
    if (current <= product.minQty) put(product, 0);
    else put(product, current - 1);
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
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

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
    <div className="space-y-4 pb-20 lg:pb-0">
      <div>
        <h1 className="font-display text-3xl">Fornecedores</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {salonCity
            ? `Fornecedores que atendem ${salonCity}. Pagamento na retirada ou na entrega, direto com a empresa.`
            : "Cadastre a cidade do salão em Configurações para ver os fornecedores da sua região."}
        </p>
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
            {id === "catalogo" && cartCount > 0 ? (
              <span className="ml-2 rounded-full bg-[#3483fa] px-1.5 text-[11px] font-semibold text-white">{cartCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "pedidos" ? (
        <SupplierOrdersBoard orders={orders} actor="salon" embedded />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <SupplierDealStrip deals={deals} />
            <div className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produtos, marcas e mais..." />
              {suppliers.length > 1 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSupplierId("all")}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs",
                      supplierId === "all" ? "bg-[#3483fa] text-white" : "bg-slate-100 text-ink-soft",
                    )}
                  >
                    Todos
                  </button>
                  {suppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => setSupplierId(supplier.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        supplierId === supplier.id ? "bg-[#3483fa] text-white" : "bg-slate-100 text-ink-soft",
                      )}
                    >
                      {supplier.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {visible.length === 0 ? (
              <Card>
                <p className="text-sm text-ink-soft">
                  {salonCity
                    ? `Nenhum fornecedor atende ${salonCity} no momento.`
                    : "Informe a cidade do salão em Configurações para ver o catálogo da sua região."}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {visible.map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    quantity={qtyOf(product.id)}
                    onAdd={() => add(product)}
                    onInc={() => add(product)}
                    onDec={() => dec(product)}
                  />
                ))}
              </div>
            )}
          </div>
          <aside id="supplier-cart" className="h-fit rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <ShoppingCart size={16} />
              Carrinho
              {cartCount > 0 ? <span className="text-sm font-normal text-ink-soft">({cartCount})</span> : null}
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-ink-soft">Adicione produtos ao carrinho para montar o pedido.</p>
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
                          <li key={line.productId} className="flex gap-2">
                            <ProductPhoto src={line.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-line" iconSize={16} />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2">{line.name}</span>
                              <span className="block text-xs text-ink-soft">{formatStockQty(line.quantity, line.unit)}</span>
                              <button type="button" className="text-xs text-red-600" onClick={() => remove(line.productId)}>
                                Remover
                              </button>
                            </span>
                            <span>{formatBRL(catalogLineCents(catalogById.get(line.productId), line.quantity, line.unitCents))}</span>
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
      {tab === "catalogo" && cartCount > 0 ? (
        <a
          href="#supplier-cart"
          className="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-[#3483fa] px-4 py-3 text-sm font-medium text-white shadow-lg lg:hidden"
        >
          <ShoppingCart size={16} />
          Carrinho · {cartCount} · {formatBRL(grandTotal)}
        </a>
      ) : null}
    </div>
  );
}
