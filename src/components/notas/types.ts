export type InvoiceRow = {
  id: string;
  kind: string;
  status: string;
  number: number | null;
  series: string | null;
  accessKey: string | null;
  protocol: string | null;
  amountCents: number;
  taxCents: number;
  issuedAt: string | null;
  clientName: string;
  comandaNumber: number | null;
  comandaId: string | null;
  environment: string;
  errorMessage: string | null;
};

export type EmitComandaOption = {
  id: string;
  number: number;
  clientName: string;
  totalCents: number;
  occurredAt: string;
};
