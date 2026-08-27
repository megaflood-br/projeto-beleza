import { FINANCE_ACCOUNTS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_LABEL, type PaymentMethod } from "@/lib/constants";

const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(INCOME_CATEGORIES.map((c) => [c.value, c.label])),
  ...Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label])),
};

export function financeCategoryLabel(category: string, categoryName?: string | null) {
  return categoryName || CATEGORY_LABEL[category] || category;
}

export function financeAccountLabel(account: string | null | undefined, accountName?: string | null) {
  return accountName || FINANCE_ACCOUNTS.find((a) => a.value === account)?.label || account || "Caixa";
}

export function financeMethodLabel(method: string, methodName?: string | null) {
  return methodName || PAYMENT_LABEL[method as PaymentMethod] || method;
}

export function financeTitular(tx: {
  type: string;
  category: string;
  description: string | null;
  supplier: string | null;
  professional?: { name: string } | null;
  comanda?: { number: number; client: { name: string } } | null;
  appointment?: { client: { name: string } } | null;
}) {
  if (tx.comanda?.client.name) return tx.comanda.client.name;
  if (tx.appointment?.client.name) return tx.appointment.client.name;
  if (tx.professional?.name) {
    return tx.category === "comissao" ? `Pagamento de comissão para ${tx.professional.name}` : tx.professional.name;
  }
  if (tx.supplier) return tx.supplier;
  return tx.description ?? financeCategoryLabel(tx.category);
}

export function financeSubtitle(tx: {
  type: string;
  description: string | null;
  comanda?: { number: number; client: { name: string } } | null;
  appointment?: { client: { name: string } } | null;
}) {
  if (tx.comanda) {
    return `Referente à comanda #${tx.comanda.number} para ${tx.comanda.client.name}.`;
  }
  if (tx.appointment) return `Referente ao agendamento de ${tx.appointment.client.name}.`;
  return tx.description;
}

export function financeOrigin(tx: {
  category: string;
  comanda?: { id: string; number: number } | null;
  appointmentId?: string | null;
}) {
  if (tx.comanda) return { label: `C#${tx.comanda.number}`, href: `/comandas/${tx.comanda.id}` };
  if (tx.category === "comissao") return { label: "Comissão", href: "/comissoes" };
  if (tx.appointmentId) return { label: "Agenda", href: "/agenda" };
  return { label: financeCategoryLabel(tx.category), href: null as string | null };
}
