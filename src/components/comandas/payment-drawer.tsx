"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Banknote, ChevronDown, CreditCard, DollarSign, Wallet, X } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { calendarDate, formatShortDate } from "@/lib/dates";
import { paymentChange } from "@/lib/comandas";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/constants";
import { feePercentLabel } from "@/lib/finance-catalog";
import type { PaymentDraft, PaymentMethodOption } from "@/components/comandas/types";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const FALLBACK_CARD: PaymentMethodOption[] = [
  { id: "", name: "Crédito", code: "CREDIT", group: "CARD", feeBps: 0, accountName: "Caixa", settlementDays: 0 },
  { id: "", name: "Débito", code: "DEBIT", group: "CARD", feeBps: 0, accountName: "Caixa", settlementDays: 0 },
];

const FALLBACK_OTHER: PaymentMethodOption[] = [
  { id: "", name: "Pix", code: "PIX", group: "OTHER", feeBps: 0, accountName: "Pix", settlementDays: 0 },
  { id: "", name: "Transferência", code: "TRANSFER", group: "OTHER", feeBps: 0, accountName: "Caixa", settlementDays: 0 },
  { id: "", name: "Pacote", code: "PACKAGE", group: "OTHER", feeBps: 0, accountName: "Caixa", settlementDays: 0 },
];

const FALLBACK_CASH: PaymentMethodOption = {
  id: "",
  name: "Dinheiro",
  code: "CASH",
  group: "CASH",
  feeBps: 0,
  accountName: "Caixa",
  settlementDays: 0,
};

export function PaymentDrawer({
  open,
  totalCents,
  discountCents,
  pending,
  error,
  methods = [],
  onClose,
  onInvoice,
}: {
  open: boolean;
  totalCents: number;
  discountCents: number;
  pending?: boolean;
  error?: string | null;
  methods?: PaymentMethodOption[];
  onClose: () => void;
  onInvoice: (payments: PaymentDraft[]) => void;
}) {
  const [amount, setAmount] = useState("0,00");
  const [installments, setInstallments] = useState("1");
  const [date, setDate] = useState(calendarDate());
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [cardOpen, setCardOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [received, setReceived] = useState("0,00");
  const [localError, setLocalError] = useState<string | null>(null);

  const cashMethods = methods.filter((m) => m.group === "CASH");
  const cardMethods = methods.filter((m) => m.group === "CARD");
  const otherMethods = methods.filter((m) => m.group !== "CASH" && m.group !== "CARD");
  const cashOptions = cashMethods.length ? cashMethods : [FALLBACK_CASH];
  const cardOptions = cardMethods.length ? cardMethods : FALLBACK_CARD;
  const otherOptions = otherMethods.length ? otherMethods : FALLBACK_OTHER;

  useEffect(() => {
    if (!open) return;
    setPayments([]);
    setAmount(centsToInput(totalCents));
    setInstallments("1");
    setDate(calendarDate());
    setCardOpen(false);
    setOtherOpen(false);
    setCashOpen(false);
    setShowChange(false);
    setReceived(centsToInput(totalCents));
    setLocalError(null);
  }, [open, totalCents]);

  const paidCents = useMemo(() => payments.reduce((sum, p) => sum + p.amountCents, 0), [payments]);
  const remaining = Math.max(0, totalCents - paidCents);
  const change = paymentChange(totalCents, parseBRLToCents(received) || paidCents);

  if (!open) return null;

  function addPayment(option: PaymentMethodOption) {
    setCardOpen(false);
    setOtherOpen(false);
    setCashOpen(false);
    setLocalError(null);
    let amountCents = parseBRLToCents(amount);
    if (amountCents <= 0) amountCents = remaining;
    if (amountCents <= 0) {
      setLocalError("Informe um valor para o pagamento.");
      return;
    }
    const qty = Math.max(1, Math.min(12, Math.round(Number(installments) || 1)));
    setPayments((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        method: option.code,
        paymentMethodId: option.id || undefined,
        methodName: option.name,
        amountCents,
        installments: qty,
        date,
      },
    ]);
    const nextRemaining = Math.max(0, remaining - amountCents);
    setAmount(centsToInput(nextRemaining));
  }

  function handleInvoice() {
    if (!payments.length) {
      setLocalError("Adicione um pagamento.");
      return;
    }
    if (paidCents < totalCents) {
      setLocalError(`Falta ${formatBRL(totalCents - paidCents)} para cobrir o total.`);
      return;
    }
    onInvoice(payments);
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar pagamentos" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">Pagamentos</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-[1.2fr_0.6fr_1fr] gap-2">
            <Field label="Valor">
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-ink-soft">R$</span>
                <Input className="pl-8" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </Field>
            <Field label="Parcelas">
              <Input
                type="number"
                min={1}
                max={12}
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </Field>
            <Field label="Pagamento">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="relative">
              <MethodButton
                icon={<DollarSign size={18} />}
                label="Dinheiro"
                chevron={cashOptions.length > 1}
                onClick={() => {
                  if (cashOptions.length === 1) addPayment(cashOptions[0]);
                  else {
                    setCardOpen(false);
                    setOtherOpen(false);
                    setCashOpen((v) => !v);
                  }
                }}
              />
              {cashOpen ? <MethodMenu options={cashOptions} onSelect={addPayment} /> : null}
            </div>
            <div className="relative">
              <MethodButton
                icon={<CreditCard size={18} />}
                label="Cartão"
                chevron
                onClick={() => {
                  setOtherOpen(false);
                  setCashOpen(false);
                  setCardOpen((v) => !v);
                }}
              />
              {cardOpen ? <MethodMenu options={cardOptions} onSelect={addPayment} /> : null}
            </div>
            <div className="relative col-span-2">
              <MethodButton
                icon={<Wallet size={18} />}
                label="Outros"
                chevron
                onClick={() => {
                  setCardOpen(false);
                  setCashOpen(false);
                  setOtherOpen((v) => !v);
                }}
              />
              {otherOpen ? <MethodMenu options={otherOptions} onSelect={addPayment} /> : null}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Pagamentos</h3>
            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Nenhum pagamento adicionado</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {payments.map((payment) => (
                  <li key={payment.key} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <div>
                      <div className="font-medium">
                        {payment.methodName || PAYMENT_LABEL[payment.method as PaymentMethod] || payment.method}
                      </div>
                      <div className="text-xs text-ink-soft">
                        {payment.installments}x · {formatShortDate(new Date(`${payment.date}T12:00:00`))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatBRL(payment.amountCents)}</span>
                      <button
                        type="button"
                        className="rounded-lg p-1 text-ink-soft hover:bg-sand"
                        aria-label="Remover pagamento"
                        onClick={() => {
                          setPayments((rows) => {
                            const next = rows.filter((row) => row.key !== payment.key);
                            const nextPaid = next.reduce((sum, row) => sum + row.amountCents, 0);
                            setAmount(centsToInput(Math.max(0, totalCents - nextPaid)));
                            return next;
                          });
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <h3 className="font-semibold">Resumo da compra</h3>
            <SummaryLine label="Descontos" value={discountCents} />
            <SummaryLine label="Total" value={totalCents} />
            <SummaryLine label="Total pago" value={paidCents} strong />
          </div>

          {showChange ? (
            <div className="mt-4 space-y-2 rounded-xl border border-line bg-slate-50 p-3">
              <Field label="Valor recebido">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-ink-soft">R$</span>
                  <Input className="bg-white pl-8" value={received} onChange={(e) => setReceived(e.target.value)} />
                </div>
              </Field>
              <p className="text-sm font-medium">
                {change > 0 ? `Troco ${formatBRL(change)}` : paidCents < totalCents ? `Falta ${formatBRL(remaining)}` : "Não há troco."}
              </p>
            </div>
          ) : null}

          {localError || error ? <p className="mt-3 text-sm text-red-600">{localError || error}</p> : null}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setShowChange(true)}>
            <Banknote size={16} />
            Calcular troco
          </Button>
          <Button type="button" variant="success" className="flex-1" disabled={pending} onClick={handleInvoice}>
            {pending ? "Faturando..." : "Faturar"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function MethodButton({
  icon,
  label,
  chevron,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  chevron?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium hover:bg-sand"
    >
      {icon}
      {label}
      {chevron ? <ChevronDown size={16} className="text-ink-soft" /> : null}
    </button>
  );
}

function MethodMenu({
  options,
  onSelect,
}: {
  options: PaymentMethodOption[];
  onSelect: (value: PaymentMethodOption) => void;
}) {
  return (
    <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-10 max-h-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-xl">
      {options.map((option) => (
        <button
          key={option.id || option.code + option.name}
          type="button"
          className="block w-full px-3 py-2 text-left text-sm hover:bg-sand"
          onClick={() => onSelect(option)}
        >
          <span className="font-medium">{option.name}</span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            {option.accountName}
            {option.feeBps ? ` · taxa ${feePercentLabel(option.feeBps)}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-base font-semibold" : "text-ink-soft"}`}>
      <span>{label}</span>
      <span className={strong ? "text-ink" : ""}>{formatBRL(value)}</span>
    </div>
  );
}
