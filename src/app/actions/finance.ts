"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/money";
import { zonedDateTime } from "@/lib/dates";
import { postLedgerEntry } from "@/lib/ledger";

export async function createTransaction(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };

  const type = String(formData.get("type") ?? "INCOME") === "EXPENSE" ? "EXPENSE" : "INCOME";
  const category = String(formData.get("category") ?? "outros") || "outros";
  const amountCents = parseBRLToCents(String(formData.get("amount") ?? "0"));
  const methodId = String(formData.get("methodId") ?? "") || null;
  const method = String(formData.get("method") ?? "PIX") || "PIX";
  const accountId = String(formData.get("accountId") ?? "") || String(formData.get("account") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const organizational = String(formData.get("organizational") ?? "") === "1";
  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const recurrence = String(formData.get("recurrence") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "");
  const competenceDate = String(formData.get("competenceDate") ?? "");

  if (!amountCents) return { error: "Informe um valor." };
  if (!category) return { error: "Selecione a categoria." };
  if (!methodId && !method) return { error: "Selecione a forma de pagamento." };

  if (professionalId) {
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!professional) return { error: "Profissional inválido." };
  }

  await postLedgerEntry({
    tenantId: session.tenantId,
    type,
    category,
    amountCents,
    methodId,
    methodCode: method,
    accountId: organizational ? null : accountId,
    description,
    organizational,
    supplier,
    professionalId,
    recurrence,
    occurredAt: dueDate ? zonedDateTime(dueDate, "12:00") : new Date(),
    competenceAt: competenceDate ? zonedDateTime(competenceDate, "12:00") : null,
  });
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/cadastros");
  return { ok: true };
}

export async function payCommissions(formData?: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };
  const data = formData instanceof FormData ? formData : new FormData();
  const professionalId = String(data.get("professionalId") ?? "");
  const ids = data.getAll("commissionId").map(String).filter(Boolean);
  const accountId = String(data.get("accountId") ?? "") || null;
  const methodId = String(data.get("methodId") ?? "") || null;

  if (!ids.length && !professionalId) return { error: "Selecione as comissões para pagar." };

  const pending = await prisma.commission.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      ...(ids.length ? { id: { in: ids } } : {}),
      ...(professionalId ? { professionalId } : {}),
    },
    include: { professional: true },
  });
  if (!pending.length) return { error: "Nenhuma comissão pendente para pagar." };

  const byProfessional = new Map<string, { name: string; total: number }>();
  for (const row of pending) {
    const current = byProfessional.get(row.professionalId) ?? { name: row.professional.name, total: 0 };
    current.total += row.amountCents;
    byProfessional.set(row.professionalId, current);
  }

  await prisma.commission.updateMany({
    where: { tenantId: session.tenantId, id: { in: pending.map((row) => row.id) } },
    data: { status: "PAID", paidAt: new Date() },
  });

  for (const [id, info] of byProfessional) {
    if (!info.total) continue;
    await postLedgerEntry({
      tenantId: session.tenantId,
      type: "EXPENSE",
      category: "comissao",
      amountCents: info.total,
      methodId,
      methodCode: "PIX",
      accountId,
      professionalId: id,
      description: `Pagamento de comissão para ${info.name}`,
    });
  }

  revalidatePath("/comissoes");
  revalidatePath("/financeiro");
  revalidatePath("/cadastros");
  return { ok: true };
}
