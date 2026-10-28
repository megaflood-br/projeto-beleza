"use client";

import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { formatStockQty } from "@/lib/stock";
import { formatPhoneBR } from "@/lib/utils";
import {
  SUPPLIER_FULFILLMENT_LABEL,
  SUPPLIER_PAY_METHOD_LABEL,
  asSupplierFulfillment,
  asSupplierPayMethod,
} from "@/lib/supplier-market";
import type { SupplierOrderRow } from "@/components/fornecedor/types";

export function PickupSlip({ order, onClose }: { order: SupplierOrderRow; onClose: () => void }) {
  const fulfillment = asSupplierFulfillment(order.fulfillment) ?? "PICKUP";
  const pay = asSupplierPayMethod(order.paymentMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 print:static print:bg-white print:p-0">
      <button type="button" className="no-print absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative my-6 w-full max-w-lg print:my-0 print:max-w-none">
        <div className="no-print mb-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            <X size={16} />
            Fechar
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </Button>
        </div>
        <article id="supplier-pickup-slip" className="print-root rounded-2xl bg-white p-6 shadow-xl print:rounded-none print:shadow-none">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Nota de retirada</p>
          <h2 className="mt-1 text-2xl font-semibold">{order.supplierName}</h2>
          <p className="text-sm text-ink-soft">Apresente esta nota e o código na retirada. Pagamento no ato, com o fornecedor.</p>
          <div className="mt-4 rounded-xl border border-line bg-sand px-4 py-3 text-center">
            <div className="text-xs text-ink-soft">Código</div>
            <div className="font-mono text-3xl font-semibold tracking-[0.2em]">{order.pickupCode ?? order.id.slice(-6).toUpperCase()}</div>
          </div>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Salão</dt>
              <dd className="font-medium">{order.salonName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Data</dt>
              <dd>{formatShortDate(new Date(order.createdAt))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Modalidade</dt>
              <dd>{SUPPLIER_FULFILLMENT_LABEL[fulfillment]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Pagamento</dt>
              <dd>{pay ? SUPPLIER_PAY_METHOD_LABEL[pay] : order.paymentMethod} na retirada</dd>
            </div>
            {order.pickupAddress ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Local</dt>
                <dd className="text-right">{order.pickupAddress}</dd>
              </div>
            ) : null}
            {order.salonPhone ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Telefone do salão</dt>
                <dd>{formatPhoneBR(order.salonPhone)}</dd>
              </div>
            ) : null}
          </dl>
          <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
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
          <div className="mt-3 flex justify-between font-medium">
            <span>Total a pagar na retirada</span>
            <span>{formatBRL(order.totalCents)}</span>
          </div>
          {order.notes ? <p className="mt-3 text-sm text-ink-soft">{order.notes}</p> : null}
        </article>
      </div>
    </div>
  );
}
