"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, MoreVertical, Plus, Scissors, ShoppingBag, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { invoiceComanda, upsertComanda } from "@/app/actions/comandas";
import { formatBRL, parseBRLToCents } from "@/lib/money";
import { comandaTotal, itemLineTotal } from "@/lib/comandas";
import { calendarDate } from "@/lib/dates";
import { PaymentDrawer } from "@/components/comandas/payment-drawer";
import type { ComandaFormValue, ComandaItemDraft, PaymentDraft } from "@/components/comandas/types";

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function itemDiscountCents(item: ComandaItemDraft) {
  const gross = Math.round(item.quantity * item.priceCents);
  if (item.discountType === "percent") {
    return Math.round(gross * ((Number(item.discount.replace(",", ".")) || 0) / 100));
  }
  return parseBRLToCents(item.discount);
}

function emptyItem(professionalId = ""): ComandaItemDraft {
  return {
    key: crypto.randomUUID(),
    type: "SERVICE",
    catalogId: "",
    professionalId,
    quantity: 1,
    priceCents: 0,
    discount: "0,00",
    discountType: "money",
  };
}

function isNextRedirect(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function ComandaDrawer({
  open,
  comanda,
  nextNumber,
  clients,
  professionals,
  services,
  products,
  onClose,
}: {
  open: boolean;
  comanda: ComandaFormValue | null;
  nextNumber: number;
  clients: { id: string; name: string; phone: string; creditCents: number; cashbackCents: number }[];
  professionals: { id: string; name: string }[];
  services: { id: string; name: string; priceCents: number }[];
  products: { id: string; name: string; priceCents: number }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const defaultPro = comanda?.professionalId ?? professionals[0]?.id ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [clientId, setClientId] = useState(comanda?.clientId ?? "");
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [items, setItems] = useState<ComandaItemDraft[]>(
    comanda?.items.length ? comanda.items : [emptyItem(defaultPro)],
  );
  const [discount, setDiscount] = useState(comanda ? centsToInput(comanda.discountCents) : "0,00");
  const [credit, setCredit] = useState(comanda ? centsToInput(comanda.creditCents) : "0,00");
  const [cashback, setCashback] = useState(comanda ? centsToInput(comanda.cashbackCents) : "0,00");

  const catalog = useMemo(
    () => [
      ...services.map((s) => ({
        value: `SERVICE:${s.id}`,
        label: s.name,
        hint: formatBRL(s.priceCents),
        priceCents: s.priceCents,
        type: "SERVICE" as const,
      })),
      ...products.map((p) => ({
        value: `PRODUCT:${p.id}`,
        label: p.name,
        hint: `Produto · ${formatBRL(p.priceCents)}`,
        priceCents: p.priceCents,
        type: "PRODUCT" as const,
      })),
    ],
    [services, products],
  );

  const lineItems = items.map((item) => ({
    quantity: item.quantity,
    priceCents: item.priceCents,
    discountCents: itemDiscountCents(item),
  }));
  const itemDiscounts = lineItems.reduce((sum, item) => sum + item.discountCents, 0);
  const headerDiscount =
    parseBRLToCents(discount) + parseBRLToCents(credit) + parseBRLToCents(cashback);
  const total = comandaTotal({
    items: lineItems,
    discountCents: parseBRLToCents(discount),
    creditCents: parseBRLToCents(credit),
    cashbackCents: parseBRLToCents(cashback),
  });

  if (!open) return null;

  function fillItems(formData: FormData) {
    formData.set("professionalId", items.find((i) => i.professionalId)?.professionalId ?? defaultPro);
    formData.delete("itemKey");
    formData.delete("itemQty");
    formData.delete("itemPrice");
    formData.delete("itemDiscount");
    formData.delete("itemDiscountType");
    formData.delete("itemProfessionalId");
    for (const item of items) {
      if (!item.catalogId) continue;
      formData.append("itemKey", `${item.type}:${item.catalogId}`);
      formData.append("itemQty", String(item.quantity));
      formData.append("itemPrice", centsToInput(item.priceCents));
      formData.append("itemDiscount", item.discount);
      formData.append("itemDiscountType", item.discountType);
      formData.append("itemProfessionalId", item.professionalId);
    }
  }

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    fillItems(formData);
    try {
      const result = await upsertComanda(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  function openPayments() {
    if (!clientId) {
      setError("Selecione um cliente.");
      return;
    }
    if (!items.some((item) => item.catalogId)) {
      setError("Inclua itens antes de faturar.");
      return;
    }
    setError(null);
    setPayOpen(true);
  }

  async function confirmInvoice(payments: PaymentDraft[]) {
    const form = formRef.current;
    if (!form) return;
    setError(null);
    setPending(true);
    const formData = new FormData(form);
    fillItems(formData);
    for (const payment of payments) {
      formData.append("payMethod", payment.method);
      formData.append("payAmount", centsToInput(payment.amountCents));
      formData.append("payInstallments", String(payment.installments));
      formData.append("payDate", payment.date);
    }
    try {
      const result = await invoiceComanda(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setPayOpen(false);
      onClose();
      router.refresh();
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      setError(err instanceof Error ? err.message : "Não foi possível faturar.");
    } finally {
      setPending(false);
    }
  }

  function updateItem(key: string, patch: Partial<ComandaItemDraft>) {
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeItem(key: string) {
    setMenuKey(null);
    setItems((rows) => (rows.length === 1 ? [emptyItem(defaultPro)] : rows.filter((row) => row.key !== key)));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{comanda ? `Editar comanda #${comanda.number}` : "Nova comanda"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form ref={formRef} action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {comanda ? <input type="hidden" name="id" value={comanda.id} /> : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.7fr]">
              <Field label="Cliente" required>
                <SearchSelect
                  name="clientId"
                  required
                  placeholder="Busque por um cliente"
                  value={clientId}
                  onChange={setClientId}
                  options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone }))}
                />
              </Field>
              <Field label="Data">
                <Input name="occurredAt" type="date" defaultValue={comanda?.occurredAt ?? calendarDate()} />
              </Field>
              <Field label="Número da comanda">
                <Input name="number" defaultValue={String(comanda?.number ?? nextNumber)} />
              </Field>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Itens da comanda</h3>
                <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setItems((rows) => [...rows, emptyItem(defaultPro)])}>
                  <Plus size={14} />
                  Item
                </Button>
              </div>
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-line">
                  <div className="grid min-w-[920px] grid-cols-[36px_1.4fr_1fr_70px_120px_150px_110px_36px] gap-2 border-b border-line bg-slate-50 px-3 py-2 text-xs font-medium text-ink-soft">
                    <span />
                    <span>Descrição</span>
                    <span>Profissional</span>
                    <span>Qtde.</span>
                    <span>Valor unitário</span>
                    <span>Desconto</span>
                    <span>Total</span>
                    <span />
                  </div>
                  {items.map((item) => {
                    const line = itemLineTotal({
                      quantity: item.quantity,
                      priceCents: item.priceCents,
                      discountCents: itemDiscountCents(item),
                    });
                    return (
                      <div
                        key={item.key}
                        className="grid min-w-[920px] grid-cols-[36px_1.4fr_1fr_70px_120px_150px_110px_36px] items-center gap-2 border-b border-line px-3 py-2 last:border-0"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                          {item.type === "PRODUCT" ? <ShoppingBag size={14} /> : <Scissors size={14} />}
                        </span>
                        <SearchSelect
                          placeholder="Selecionar serviço"
                          value={item.catalogId ? `${item.type}:${item.catalogId}` : ""}
                          onChange={(value) => {
                            const option = catalog.find((c) => c.value === value);
                            if (!option) {
                              updateItem(item.key, { catalogId: "", priceCents: 0 });
                              return;
                            }
                            updateItem(item.key, {
                              type: option.type,
                              catalogId: option.value.split(":")[1] ?? "",
                              priceCents: option.priceCents,
                            });
                          }}
                          options={catalog}
                        />
                        <SearchSelect
                          placeholder="Profissional"
                          value={item.professionalId}
                          onChange={(professionalId) => updateItem(item.key, { professionalId })}
                          emptyOption={{ value: "", label: "Sem profissional" }}
                          options={professionals.map((p) => ({ value: p.id, label: p.name }))}
                        />
                        <Input
                          className="h-11 px-2 text-center"
                          type="number"
                          min={0.1}
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) || 0 })}
                        />
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-ink-soft">R$</span>
                          <Input
                            className="pl-8"
                            value={centsToInput(item.priceCents)}
                            onChange={(e) => updateItem(item.key, { priceCents: parseBRLToCents(e.target.value) })}
                          />
                        </div>
                        <div className="grid grid-cols-[1fr_64px] gap-1">
                          <Input value={item.discount} onChange={(e) => updateItem(item.key, { discount: e.target.value })} />
                          <Select
                            value={item.discountType}
                            onChange={(e) => updateItem(item.key, { discountType: e.target.value === "percent" ? "percent" : "money" })}
                          >
                            <option value="money">R$</option>
                            <option value="percent">%</option>
                          </Select>
                        </div>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-ink-soft">R$</span>
                          <Input className="bg-slate-50 pl-8" readOnly tabIndex={-1} value={centsToInput(line)} />
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-ink-soft hover:bg-sand"
                            aria-label="Ações do item"
                            onClick={() => setMenuKey((current) => (current === item.key ? null : item.key))}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuKey === item.key ? (
                            <div className="absolute top-9 right-0 z-10 min-w-32 rounded-lg border border-line bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-sand"
                                onClick={() => removeItem(item.key)}
                              >
                                Remover
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="ml-auto grid w-full max-w-xs gap-2 text-sm xl:ml-0">
                  <SummaryRow label="Desconto" name="discount" value={discount} onChange={setDiscount} />
                  <SummaryRow label="Crédito" name="credit" value={credit} onChange={setCredit} />
                  <SummaryRow label="Cashback" name="cashback" value={cashback} onChange={setCashback} />
                  <div className="flex items-center justify-between border-t border-line pt-2 font-semibold">
                    <span>Total</span>
                    <span>{formatBRL(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Field label="Observações">
                <Textarea name="notes" placeholder="Escreva aqui" defaultValue={comanda?.notes ?? ""} className="min-h-28" />
              </Field>
            </div>
            {error && !payOpen ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
            <button
              type="button"
              className="mr-auto rounded-lg p-2 text-ink-soft hover:bg-sand"
              title="A comanda avulsa registra consumo e pode ser faturada depois do atendimento."
              aria-label="Ajuda"
            >
              <HelpCircle size={18} />
            </button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && !payOpen ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={openPayments}>
              Faturar
            </Button>
          </div>
        </form>
      </aside>
      <PaymentDrawer
        open={payOpen}
        totalCents={total}
        discountCents={headerDiscount + itemDiscounts}
        pending={pending}
        error={payOpen ? error : null}
        onClose={() => setPayOpen(false)}
        onInvoice={confirmInvoice}
      />
    </div>
  );
}

function SummaryRow({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <div className="relative w-32">
        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-ink-soft">R$</span>
        <Input className="h-9 pl-8" name={name} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}
