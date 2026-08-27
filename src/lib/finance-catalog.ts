import { prisma } from "@/lib/db";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/utils";

export type CatalogAccount = {
  id: string;
  name: string;
  details: string;
  adminOnly: boolean;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
};

export type CatalogMethod = {
  id: string;
  name: string;
  code: string;
  group: "CASH" | "CARD" | "OTHER" | string;
  feeBps: number;
  accountId: string;
  accountName: string;
  settlementDays: number;
  autoSettle: boolean;
  favorite: boolean;
  active: boolean;
  sortOrder: number;
};

export type CatalogCategory = {
  id: string;
  name: string;
  type: string;
  slug: string;
  active: boolean;
  sortOrder: number;
};

const DEFAULT_ACCOUNTS = [
  { name: "Banco C6", details: "Somente para administrador", adminOnly: true },
  { name: "Caixa", details: "Caixa", adminOnly: false, isDefault: true },
  { name: "Carteira FI Nubank", details: "Somente para administrador", adminOnly: true },
  { name: "Cofre", details: "Somente para administrador", adminOnly: true },
  { name: "Cora", details: "Somente para administrador", adminOnly: true },
  { name: "Cortesias e Outros (Desconsiderar)", details: "Somente para administrador", adminOnly: true },
  { name: "Infinite Cosméticos", details: "Somente para administrador", adminOnly: true },
  { name: "Infinite Renove", details: "Somente para administrador", adminOnly: true },
  { name: "Itau Emps", details: "Somente para administrador", adminOnly: true },
  { name: "Laser Estância Lynce", details: "Somente para administrador", adminOnly: true },
  { name: "Pic Pay (Cosméticos)", details: "Somente para administrador", adminOnly: true },
  { name: "Pix", details: "Pix", adminOnly: false },
  { name: "Título de Capitalização Icatu", details: "Somente para administrador", adminOnly: true },
] as const;

function eloFeeBps(installments: number) {
  const pct = 4.91 + ((10.76 - 4.91) * (installments - 1)) / 9;
  return Math.round(pct * 100);
}

type MethodSeed = {
  name: string;
  code: string;
  group: "CASH" | "CARD" | "OTHER";
  feeBps: number;
  account: string;
  settlementDays: number;
  favorite?: boolean;
};

function defaultMethods(): MethodSeed[] {
  const elo = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    return {
      name: `CC Elo ${n}x`,
      code: "CREDIT",
      group: "CARD" as const,
      feeBps: eloFeeBps(n),
      account: "Itau Emps",
      settlementDays: 1,
    };
  });
  return [
    { name: "Dinheiro", code: "CASH", group: "CASH", feeBps: 0, account: "Caixa", settlementDays: 0, favorite: true },
    { name: "Pix", code: "PIX", group: "OTHER", feeBps: 0, account: "Pix", settlementDays: 0, favorite: true },
    { name: "Transferência", code: "TRANSFER", group: "OTHER", feeBps: 0, account: "Itau Emps", settlementDays: 0 },
    { name: "Pacote", code: "PACKAGE", group: "OTHER", feeBps: 0, account: "Caixa", settlementDays: 0 },
    { name: "Boleto", code: "BOLETO", group: "OTHER", feeBps: 0, account: "Cora", settlementDays: 2 },
    { name: "Débito", code: "DEBIT", group: "CARD", feeBps: 189, account: "Itau Emps", settlementDays: 1 },
    { name: "Cartão Débito Elo", code: "DEBIT", group: "CARD", feeBps: 189, account: "Itau Emps", settlementDays: 1 },
    { name: "Amex", code: "CREDIT", group: "CARD", feeBps: 536, account: "Itau Emps", settlementDays: 1 },
    { name: "CC Visa ou Master 2X", code: "CREDIT", group: "CARD", feeBps: 549, account: "Itau Emps", settlementDays: 1 },
    ...elo,
  ];
}

const seeding = new Map<string, Promise<void>>();

export async function ensureFinanceCatalog(tenantId: string) {
  const existing = seeding.get(tenantId);
  if (existing) {
    await existing;
    return;
  }
  const task = seedIfEmpty(tenantId).finally(() => seeding.delete(tenantId));
  seeding.set(tenantId, task);
  await task;
}

async function seedIfEmpty(tenantId: string) {
  const count = await prisma.financeAccount.count({ where: { tenantId } });
  if (count === 0) {
    await createDefaultCatalog(tenantId);
  }
  await backfillTransactions(tenantId);
}

export async function createDefaultCatalog(tenantId: string) {
  const accounts = [];
  for (const [index, account] of DEFAULT_ACCOUNTS.entries()) {
    accounts.push(
      await prisma.financeAccount.create({
        data: {
          tenantId,
          name: account.name,
          details: account.details,
          adminOnly: account.adminOnly,
          isDefault: "isDefault" in account ? Boolean(account.isDefault) : false,
          sortOrder: index,
        },
      }),
    );
  }
  const byName = new Map(accounts.map((a) => [a.name, a]));
  const caixa = byName.get("Caixa") ?? accounts[0];

  for (const [index, method] of defaultMethods().entries()) {
    const account = byName.get(method.account) ?? caixa;
    await prisma.paymentMethodConfig.create({
      data: {
        tenantId,
        name: method.name,
        code: method.code,
        group: method.group,
        feeBps: method.feeBps,
        accountId: account.id,
        settlementDays: method.settlementDays,
        autoSettle: true,
        favorite: Boolean(method.favorite),
        sortOrder: index,
      },
    });
  }

  const categories: { tenantId: string; name: string; type: string; slug: string; sortOrder: number }[] = [
    ...INCOME_CATEGORIES.map((c, i) => ({
      tenantId,
      name: c.value === "comanda" ? "Comanda" : c.label,
      type: "INCOME",
      slug: c.value,
      sortOrder: i,
    })),
    ...EXPENSE_CATEGORIES.map((c, i) => ({
      tenantId,
      name: c.label,
      type: "EXPENSE",
      slug: c.value,
      sortOrder: i,
    })),
  ];
  await prisma.financeCategory.createMany({ data: categories });
}

async function backfillTransactions(tenantId: string) {
  const orphans = await prisma.transaction.findMany({
    where: { tenantId, OR: [{ accountId: null }, { netCents: 0, amountCents: { gt: 0 } }] },
    select: { id: true, account: true, method: true, amountCents: true, feeCents: true, netCents: true, accountId: true, type: true },
  });
  if (!orphans.length) return;

  const [accounts, methods] = await Promise.all([
    prisma.financeAccount.findMany({ where: { tenantId } }),
    prisma.paymentMethodConfig.findMany({ where: { tenantId, active: true }, orderBy: [{ favorite: "desc" }, { sortOrder: "asc" }] }),
  ]);
  const accountBySlug = new Map(accounts.map((a) => [slugify(a.name), a]));
  const caixa = accounts.find((a) => a.isDefault) ?? accounts.find((a) => slugify(a.name) === "caixa") ?? accounts[0];
  const pix = accounts.find((a) => slugify(a.name) === "pix");
  const banco = accounts.find((a) => /itau|banco|c6/i.test(a.name));

  for (const tx of orphans) {
    const method = methods.find((m) => m.code === tx.method) ?? null;
    let account =
      (tx.accountId ? accounts.find((a) => a.id === tx.accountId) : null) ??
      accountBySlug.get(tx.account) ??
      (tx.account === "pix" ? pix : null) ??
      (tx.account === "banco" ? banco : null) ??
      (tx.account === "nenhuma" ? null : caixa);
    if (tx.account === "nenhuma") account = null;
    const net = tx.netCents > 0 ? tx.netCents : Math.max(0, tx.amountCents - tx.feeCents);
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        accountId: account?.id ?? null,
        paymentMethodId: method?.id ?? undefined,
        netCents: net,
      },
    });
  }
}

export async function loadFinanceCatalog(tenantId: string) {
  await ensureFinanceCatalog(tenantId);
  const [accounts, methods, categories] = await Promise.all([
    prisma.financeAccount.findMany({ where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.paymentMethodConfig.findMany({
      where: { tenantId },
      include: { account: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.financeCategory.findMany({ where: { tenantId }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  return {
    accounts: accounts.map(
      (a): CatalogAccount => ({
        id: a.id,
        name: a.name,
        details: a.details,
        adminOnly: a.adminOnly,
        isDefault: a.isDefault,
        active: a.active,
        sortOrder: a.sortOrder,
      }),
    ),
    methods: methods.map(
      (m): CatalogMethod => ({
        id: m.id,
        name: m.name,
        code: m.code,
        group: m.group,
        feeBps: m.feeBps,
        accountId: m.accountId,
        accountName: m.account.name,
        settlementDays: m.settlementDays,
        autoSettle: m.autoSettle,
        favorite: m.favorite,
        active: m.active,
        sortOrder: m.sortOrder,
      }),
    ),
    categories: categories.map(
      (c): CatalogCategory => ({
        id: c.id,
        name: c.name,
        type: c.type,
        slug: c.slug,
        active: c.active,
        sortOrder: c.sortOrder,
      }),
    ),
  };
}

export function accountDetailsLabel(account: { details: string; adminOnly: boolean; name: string }) {
  if (account.adminOnly) return account.details || "Somente para administrador";
  return account.details || account.name;
}

export function feePercentLabel(feeBps: number) {
  return `${(feeBps / 100).toFixed(2).replace(".", ",")}%`;
}
