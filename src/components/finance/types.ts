export type TransactionFormValue = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amountCents: number;
  methodId: string | null;
  method: string;
  accountId: string | null;
  description: string | null;
  organizational: boolean;
  supplier: string | null;
  professionalId: string | null;
  recurrence: string | null;
  dueDate: string;
  competenceDate: string;
};

export type TransactionListRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  dateLabel: string;
  titular: string;
  subtitle: string | null;
  originLabel: string;
  originHref: string | null;
  methodLabel: string;
  accountLabel: string;
  settled: boolean;
  organizational: boolean;
  categoryLabel: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  form: TransactionFormValue;
};
