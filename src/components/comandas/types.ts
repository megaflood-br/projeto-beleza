export type ComandaItemDraft = {
  key: string;
  type: "SERVICE" | "PRODUCT";
  catalogId: string;
  professionalId: string;
  quantity: number;
  priceCents: number;
  discount: string;
  discountType: "money" | "percent";
};

export type PaymentDraft = {
  key: string;
  method: string;
  amountCents: number;
  installments: number;
  date: string;
};

export type ComandaFormValue = {
  id: string;
  number: number;
  clientId: string;
  clientName: string;
  professionalId: string | null;
  status: string;
  notes: string | null;
  discountCents: number;
  creditCents: number;
  cashbackCents: number;
  paymentMethod: string | null;
  occurredAt: string;
  totalCents: number;
  items: ComandaItemDraft[];
};
