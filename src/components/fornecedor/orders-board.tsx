"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { changeSupplierOrderStatus, receiveSupplierOrder } from "@/app/actions/supplier-orders";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { formatStockQty } from "@/lib/stock";
import {
  SUPPLIER_ORDER_STATUS_COLOR,
  SUPPLIER_ORDER_STATUS_LABEL,
  canChangeSupplierOrder,
  canReceiveSupplierOrder,
} from "@/lib/supplier-market";
import type { SupplierOrderRow } from "@/components/fornecedor/types";

export function SupplierOrdersBoard({
  orders,
  actor,
}: {
  orders: SupplierOrderRow[];
  actor: "salon" | "supplier";
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div>
        <h1 className="font-display text-3xl">Pedidos</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {actor === "supplier" ? "Pedidos que os salões fizeram no seu catálogo." : "O que você pediu aos fornecedores da plataforma."}
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-soft">Nenhum pedido ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const label = SUPPLIER_ORDER_STATUS_LABEL[order.status as keyof typeof SUPPLIER_ORDER_STATUS_LABEL] ?? order.status;
            const color = SUPPLIER_ORDER_STATUS_COLOR[order.status as keyof typeof SUPPLIER_ORDER_STATUS_COLOR] ?? "#64748B";
            const busy = pendingId === order.id;
            return (
              <Card key={order.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{actor === "supplier" ? order.salonName : order.supplierName}</div>
                    <div className="text-xs text-ink-soft">
                      {formatShortDate(new Date(order.createdAt))} · #{order.id.slice(-6).toUpperCase()}
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: color }}>
                    {label}
                  </span>
                </div>
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
                </ul>
                {order.notes ? <p className="text-sm text-ink-soft">{order.notes}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <div className="font-medium">{formatBRL(order.totalCents)}</div>
                  <div className="flex flex-wrap gap-2">
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
                        Marcar enviado
                      </Button>
                    ) : null}
                    {actor === "supplier" && canChangeSupplierOrder(order.status, "DELIVERED", "supplier") ? (
                      <Button type="button" disabled={busy} onClick={() => void run(order.id, changeSupplierOrderStatus, { actor, status: "DELIVERED" })}>
                        Marcar entregue
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
    </div>
  );
}
