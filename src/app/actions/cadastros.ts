"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { ensureFinanceCatalog } from "@/lib/finance-catalog";

function revalidateCadastros() {
  revalidatePath("/cadastros");
  revalidatePath("/financeiro");
  revalidatePath("/comandas");
  revalidatePath("/comissoes");
}

async function requireFinance() {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." as const, session: null };
  await ensureFinanceCatalog(session.tenantId);
  return { session, error: null as string | null };
}

function parseFeeBps(raw: string) {
  const trimmed = raw.trim().replace("%", "").replace(/\s/g, "");
  if (!trimmed) return 0;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (trimmed.includes(",") || trimmed.includes(".")) return Math.round(n * 100);
  return n > 100 ? Math.round(n) : Math.round(n * 100);
}

export async function saveFinanceAccount(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const tenantId = auth.session.tenantId;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const adminOnly = String(formData.get("adminOnly") ?? "") === "1";
  const isDefault = String(formData.get("isDefault") ?? "") === "1";
  if (!name) return { error: "Informe o nome da conta." };

  if (isDefault) {
    await prisma.financeAccount.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
  }

  if (id) {
    const existing = await prisma.financeAccount.findFirst({ where: { id, tenantId } });
    if (!existing) return { error: "Conta não encontrada." };
    await prisma.financeAccount.update({
      where: { id },
      data: { name, details, adminOnly, isDefault: isDefault || existing.isDefault },
    });
  } else {
    const last = await prisma.financeAccount.findFirst({ where: { tenantId }, orderBy: { sortOrder: "desc" } });
    await prisma.financeAccount.create({
      data: { tenantId, name, details, adminOnly, isDefault, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
  revalidateCadastros();
  return { ok: true };
}

export async function deleteFinanceAccount(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const account = await prisma.financeAccount.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    include: { _count: { select: { paymentMethods: true, transactions: true } } },
  });
  if (!account) return { error: "Conta não encontrada." };
  if (account._count.paymentMethods || account._count.transactions) {
    return { error: "Esta conta está em uso. Desative em vez de excluir." };
  }
  await prisma.financeAccount.delete({ where: { id } });
  revalidateCadastros();
  return { ok: true };
}

export async function savePaymentMethod(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const tenantId = auth.session.tenantId;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase() || "PIX";
  const group = String(formData.get("group") ?? "OTHER");
  const accountId = String(formData.get("accountId") ?? "");
  const feeBps = parseFeeBps(String(formData.get("fee") ?? "0"));
  const settlementDays = Math.max(0, Math.round(Number(formData.get("settlementDays") ?? "0") || 0));
  const autoSettle = String(formData.get("autoSettle") ?? "1") === "1";
  const favorite = String(formData.get("favorite") ?? "") === "1";
  if (!name) return { error: "Informe o nome da forma de pagamento." };
  const account = await prisma.financeAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) return { error: "Selecione a conta de destino." };
  const allowedGroup = group === "CASH" || group === "CARD" ? group : "OTHER";

  if (id) {
    const existing = await prisma.paymentMethodConfig.findFirst({ where: { id, tenantId } });
    if (!existing) return { error: "Forma de pagamento não encontrada." };
    await prisma.paymentMethodConfig.update({
      where: { id },
      data: { name, code, group: allowedGroup, accountId, feeBps, settlementDays, autoSettle, favorite },
    });
  } else {
    const last = await prisma.paymentMethodConfig.findFirst({ where: { tenantId }, orderBy: { sortOrder: "desc" } });
    await prisma.paymentMethodConfig.create({
      data: {
        tenantId,
        name,
        code,
        group: allowedGroup,
        accountId,
        feeBps,
        settlementDays,
        autoSettle,
        favorite,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  revalidateCadastros();
  return { ok: true };
}

export async function deletePaymentMethod(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const method = await prisma.paymentMethodConfig.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    include: { _count: { select: { transactions: true } } },
  });
  if (!method) return { error: "Forma de pagamento não encontrada." };
  if (method._count.transactions) return { error: "Esta forma está em uso. Desative em vez de excluir." };
  await prisma.paymentMethodConfig.delete({ where: { id } });
  revalidateCadastros();
  return { ok: true };
}

export async function togglePaymentFavorite(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const method = await prisma.paymentMethodConfig.findFirst({ where: { id, tenantId: auth.session.tenantId } });
  if (!method) return { error: "Forma de pagamento não encontrada." };
  await prisma.paymentMethodConfig.update({ where: { id }, data: { favorite: !method.favorite } });
  revalidateCadastros();
  return { ok: true };
}

export async function saveFinanceCategory(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const tenantId = auth.session.tenantId;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "INCOME") === "EXPENSE" ? "EXPENSE" : "INCOME";
  if (!name) return { error: "Informe o nome da categoria." };
  const slug = slugify(name) || "outros";

  if (id) {
    const existing = await prisma.financeCategory.findFirst({ where: { id, tenantId } });
    if (!existing) return { error: "Categoria não encontrada." };
    await prisma.financeCategory.update({ where: { id }, data: { name, type } });
  } else {
    const last = await prisma.financeCategory.findFirst({
      where: { tenantId, type },
      orderBy: { sortOrder: "desc" },
    });
    await prisma.financeCategory.create({
      data: { tenantId, name, type, slug, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
  revalidateCadastros();
  return { ok: true };
}

export async function deleteFinanceCategory(formData: FormData) {
  const auth = await requireFinance();
  if (auth.error || !auth.session) return { error: auth.error ?? "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const category = await prisma.financeCategory.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    include: { _count: { select: { transactions: true } } },
  });
  if (!category) return { error: "Categoria não encontrada." };
  if (category._count.transactions) return { error: "Esta categoria está em uso. Desative em vez de excluir." };
  await prisma.financeCategory.delete({ where: { id } });
  revalidateCadastros();
  return { ok: true };
}
