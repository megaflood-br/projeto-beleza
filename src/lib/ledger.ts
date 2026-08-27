import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { ensureFinanceCatalog } from "@/lib/finance-catalog";

export function feeCents(amountCents: number, feeBps: number) {
  if (amountCents <= 0 || feeBps <= 0) return 0;
  return Math.round((amountCents * feeBps) / 10_000);
}

export function netAmountCents(amountCents: number, feeBps: number) {
  return Math.max(0, amountCents - feeCents(amountCents, feeBps));
}

export function settlementLabel(days: number) {
  if (days <= 0) return "À vista";
  if (days === 1) return "Disponível em 1 dia";
  return `Disponível em ${days} dias`;
}

export function availableAt(occurredAt: Date, settlementDays: number) {
  return addDays(occurredAt, Math.max(0, settlementDays));
}

export function transactionNetCents(tx: { netCents: number; amountCents: number; feeCents?: number }) {
  if (tx.netCents) return tx.netCents;
  if (tx.feeCents) return Math.max(0, tx.amountCents - tx.feeCents);
  return tx.amountCents;
}

export function accountBalanceDelta(tx: { type: string; netCents: number; settled: boolean }) {
  if (!tx.settled) return 0;
  return tx.type === "EXPENSE" ? -tx.netCents : tx.netCents;
}

export type AccountBalanceInput = {
  accounts: { id: string; name: string; details: string; isDefault: boolean; active: boolean; sortOrder: number }[];
  methods: { accountId: string; name: string; active: boolean }[];
  transactions: {
    accountId: string | null;
    type: string;
    settled: boolean;
    netCents: number;
    amountCents: number;
    feeCents?: number;
    organizational?: boolean;
  }[];
};

export type AccountBalanceRow = {
  accountId: string;
  name: string;
  details: string;
  isDefault: boolean;
  methodNames: string[];
  incomeCents: number;
  expenseCents: number;
  settledCents: number;
  pendingCents: number;
};

export function summarizeAccountBalances(input: AccountBalanceInput): AccountBalanceRow[] {
  const linked = new Set(input.methods.filter((m) => m.active).map((m) => m.accountId));
  const methodsByAccount = new Map<string, string[]>();
  for (const method of input.methods) {
    if (!method.active) continue;
    const list = methodsByAccount.get(method.accountId) ?? [];
    if (!list.includes(method.name)) list.push(method.name);
    methodsByAccount.set(method.accountId, list);
  }

  const totals = new Map<string, { income: number; expense: number; settled: number; pending: number }>();
  for (const tx of input.transactions) {
    if (tx.organizational || !tx.accountId) continue;
    const net = transactionNetCents(tx);
    const current = totals.get(tx.accountId) ?? { income: 0, expense: 0, settled: 0, pending: 0 };
    if (tx.type === "EXPENSE") {
      current.expense += net;
      if (tx.settled) current.settled -= net;
    } else {
      current.income += net;
      if (tx.settled) current.settled += net;
      else current.pending += net;
    }
    totals.set(tx.accountId, current);
  }

  return input.accounts
    .filter((account) => account.active && (linked.has(account.id) || totals.has(account.id)))
    .map((account) => {
      const row = totals.get(account.id) ?? { income: 0, expense: 0, settled: 0, pending: 0 };
      return {
        accountId: account.id,
        name: account.name,
        details: account.details,
        isDefault: account.isDefault,
        methodNames: methodsByAccount.get(account.id) ?? [],
        incomeCents: row.income,
        expenseCents: row.expense,
        settledCents: row.settled,
        pendingCents: row.pending,
      };
    });
}

export type LedgerEntryInput = {
  tenantId: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amountCents: number;
  methodId?: string | null;
  methodCode?: string | null;
  accountId?: string | null;
  description?: string | null;
  organizational?: boolean;
  supplier?: string | null;
  professionalId?: string | null;
  recurrence?: string | null;
  appointmentId?: string | null;
  comandaId?: string | null;
  occurredAt?: Date;
  competenceAt?: Date | null;
};

export async function resolvePaymentMethod(tenantId: string, opts: { id?: string | null; code?: string | null }) {
  await ensureFinanceCatalog(tenantId);
  if (opts.id) {
    const byId = await prisma.paymentMethodConfig.findFirst({
      where: { id: opts.id, tenantId, active: true },
      include: { account: true },
    });
    if (byId) return byId;
  }
  const code = (opts.code || "").trim();
  if (code) {
    const byCode = await prisma.paymentMethodConfig.findFirst({
      where: { tenantId, active: true, code },
      include: { account: true },
      orderBy: [{ favorite: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    if (byCode) return byCode;
  }
  return prisma.paymentMethodConfig.findFirst({
    where: { tenantId, active: true },
    include: { account: true },
    orderBy: [{ favorite: "desc" }, { sortOrder: "asc" }],
  });
}

export async function resolveAccount(tenantId: string, accountId?: string | null) {
  await ensureFinanceCatalog(tenantId);
  if (accountId) {
    const found = await prisma.financeAccount.findFirst({
      where: { id: accountId, tenantId, active: true },
    });
    if (found) return found;
  }
  return (
    (await prisma.financeAccount.findFirst({
      where: { tenantId, active: true, isDefault: true },
      orderBy: { sortOrder: "asc" },
    })) ??
    prisma.financeAccount.findFirst({
      where: { tenantId, active: true },
      orderBy: { sortOrder: "asc" },
    })
  );
}

export async function resolveCategory(tenantId: string, slug: string, type: "INCOME" | "EXPENSE") {
  await ensureFinanceCatalog(tenantId);
  return prisma.financeCategory.findFirst({
    where: { tenantId, slug, type, active: true },
  });
}

export async function postLedgerEntry(input: LedgerEntryInput) {
  const organizational = Boolean(input.organizational);
  const occurredAt = input.occurredAt ?? new Date();
  const method = organizational
    ? null
    : await resolvePaymentMethod(input.tenantId, { id: input.methodId, code: input.methodCode });
  const account = organizational
    ? null
    : await resolveAccount(input.tenantId, input.accountId || method?.accountId);
  const category = await resolveCategory(input.tenantId, input.category, input.type);
  const feeBps = input.type === "INCOME" ? (method?.feeBps ?? 0) : 0;
  const fee = feeCents(input.amountCents, feeBps);
  const net = netAmountCents(input.amountCents, feeBps);
  const days = method?.settlementDays ?? 0;
  const settled = organizational ? true : (method?.autoSettle ?? true);

  return prisma.transaction.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      category: category?.slug ?? input.category,
      categoryId: category?.id,
      amountCents: input.amountCents,
      feeCents: fee,
      netCents: net,
      method: method?.code ?? input.methodCode ?? "PIX",
      paymentMethodId: method?.id,
      account: account ? slugify(account.name) || "caixa" : organizational ? "nenhuma" : "caixa",
      accountId: account?.id,
      description: input.description,
      organizational,
      supplier: input.supplier,
      professionalId: input.professionalId,
      recurrence: input.recurrence,
      appointmentId: input.appointmentId,
      comandaId: input.comandaId,
      occurredAt,
      competenceAt: input.competenceAt ?? null,
      availableAt: availableAt(occurredAt, days),
      settled,
    },
  });
}
