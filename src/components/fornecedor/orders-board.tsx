"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { PickupSlip } from "@/components/fornecedor/pickup-slip";
import { changeSupplierOrderStatus, receiveSupplierOrder } from "@/app/actions/supplier-orders";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { formatStockQty } from "@/lib/stock";
import {
  SUPPLIER_FULFILLMENT_LABEL,
  SUPPLIER_ORDER_STATUS_COLOR,
  SUPPLIER_PAY_METHOD_LABEL,
  asSupplierFulfillment,
  asSupplierOrderStatus,
  asSupplierPayMethod,
  canChangeSupplierOrder,
  canReceiveSupplierOrder,
  supplierOrderStatusLabel,
} from "@/lib/supplier-market";
import type { SupplierOrderRow } from "@/components/fornecedor/types";

export function SupplierOrdersBoard({
  orders,
  actor,
  embedded,
}: {
  orders: SupplierOrderRow[];
  actor: "salon" | "supplier";
  embedded?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slip, setSlip] = useState<SupplierOrderRow | null>(null);

  async function run(id: string, fn: (fd: FormData) => Promise<{ error?: string } | { ok: true }>, extra?: Record<string, string>) {
    setError(null);
    setPendingId(id);
    const fd = new FormData();
    fd.set("id", id);
    if (extra) for (const [key, value] of Object.entries(extra)) fd.set(key, value);
    try {
      const result = await fn(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {embedded ? null : (
        <div>
          <h1 className="font-display text-3xl">Pedidos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {actor === "supplier" ? "Pedidos que os salões fizeram no seu catálogo." : "O que você pediu aos fornecedores da plataforma."}
          </p>
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">Nenhum pedido ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = asSupplierOrderStatus(order.status);
            const fulfillment = asSupplierFulfillment(order.fulfillment) ?? "PICKUP";
            const pay = asSupplierPayMethod(order.paymentMethod);
            const color = (status && SUPPLIER_ORDER_STATUS_COLOR[status]) || "#64748B";
            const busy = pendingId === order.id;
            return (
              <Card key={order.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{actor === "supplier" ? order.salonName : order.supplierName}</div>
                    <div className="text-xs text-ink-soft">
                      {formatShortDate(new Date(order.createdAt))}
                      {order.pickupCode ? ` · ${order.pickupCode}` : ` · #${order.id.slice(-6).toUpperCase()}`}
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: color }}>
                    {supplierOrderStatusLabel(order.status, order.fulfillment)}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">
                  {SUPPLIER_FULFILLMENT_LABEL[fulfillment]} · {pay ? SUPPLIER_PAY_METHOD_LABEL[pay] : order.paymentMethod} no ato, com o fornecedor
                </p>
                {fulfillment === "DELIVERY" && order.salonAddress ? (
                  <p className="text-sm text-ink-soft">Entregar em {order.salonAddress}</p>
                ) : null}
                {fulfillment === "PICKUP" && order.pickupAddress ? (
                  <p className="text-sm text-ink-soft">Retirar em {order.pickupAddress}</p>
                ) : null}
                <ul className="space-y-1 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span>
                        {item.name}
                        <span className="text-ink-soft"> · {formatStockQty(item.quantity, item.unit)}</span>
                      </span>
                      <span>{formatBRL(item.lineCents)}</span>
                    </li>
                  ))}
                  {order.deliveryFeeCents > 0 ? (
                    <li className="flex justify-between gap-3 text-ink-soft">
                      <span>Taxa de entrega</span>
                      <span>{formatBRL(order.deliveryFeeCents)}</span>
                    </li>
                  ) : null}
                </ul>
                {order.notes ? <p className="text-sm text-ink-soft">{order.notes}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <div className="font-medium">{formatBRL(order.totalCents)}</div>
                  <div className="flex flex-wrap gap-2">
                    {fulfillment === "PICKUP" && order.status !== "CANCELLED" ? (
                      <Button type="button" variant="outline" onClick={() => setSlip(order)}>
                        Nota de retirada
                      </Button>
                    ) : null}
                    {canChangeSupplierOrder(order.status, "CANCELLED", actor) ? (
                      <Button type="button" variant="ghost" disabled={busy} onClick={() => void run(order.id, changeSupplierOrderStatus, { actor, status: "CANCELLED" })}>
                        Cancelar
                      </Button>
                    ) : null}
                    {actor === "supplier" && canChangeSupplierOrder(order.status, "CONFIRMED", "supplier") ? (
                      <Button type="button" disabled={busy} onClick={() => void run(order.id, changeSupplierOrderStatus, { actor, status: "CONFIRMED" })}>
                        Confirmar
                      </Button>
                    ) : null}
                    {actor === "supplier" && canChangeSupplierOrder(order.status, "SHIPPED", "supplier") ? (
                      <Button type="button" disabled={busy} onClick={() => void run(order.id, changeSupplierOrderStatus, { actor, status: "SHIPPED" })}>
                        {fulfillment === "PICKUP" ? "Pronto para retirada" : "Saiu para entrega"}
                      </Button>
                    ) : null}
                    {actor === "supplier" && canChangeSupplierOrder(order.status, "DELIVERED", "supplier") ? (
                      <Button type="button" disabled={busy} onClick={() => void run(order.id, changeSupplierOrderStatus, { actor, status: "DELIVERED" })}>
                        {fulfillment === "PICKUP" ? "Confirmar retirada" : "Marcar entregue"}
                      </Button>
                    ) : null}
                    {actor === "salon" && canReceiveSupplierOrder(order.status, order.receivedAt) ? (
                      <Button type="button" disabled={busy} onClick={() => void run(order.id, receiveSupplierOrder)}>
                        Lançar no estoque
                      </Button>
                    ) : null}
                    {order.receivedAt ? <span className="text-xs text-emerald-700">No estoque</span> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {slip ? <PickupSlip order={slip} onClose={() => setSlip(null)} /> : null}
    </div>
  );
}
