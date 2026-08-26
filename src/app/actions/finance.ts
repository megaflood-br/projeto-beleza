"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/money";
import { zonedDateTime } from "@/lib/dates";

export async function createTransaction(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };

  const type = String(formData.get("type") ?? "INCOME") === "EXPENSE" ? "EXPENSE" : "INCOME";
  const category = String(formData.get("category") ?? "outros") || "outros";
  const amountCents = parseBRLToCents(String(formData.get("amount") ?? "0"));
  const method = String(formData.get("method") ?? "PIX") || "PIX";
  const account = String(formData.get("account") ?? "caixa") || "caixa";
  const description = String(formData.get("description") ?? "").trim() || null;
  const organizational = String(formData.get("organizational") ?? "") === "1";
  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const recurrence = String(formData.get("recurrence") ?? "").trim() || null;
  const dueDate = String(formData.get("dueDate") ?? "");
  const competenceDate = String(formData.get("competenceDate") ?? "");

  if (!amountCents) return { error: "Informe um valor." };
  if (!category) return { error: "Selecione a categoria." };
  if (!method) return { error: "Selecione a forma de pagamento." };

  if (professionalId) {
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!professional) return { error: "Profissional inválido." };
  }

  await prisma.transaction.create({
    data: {
      tenantId: session.tenantId,
      type,
      category,
      amountCents,
      method,
      account: organizational ? "nenhuma" : account,
      description,
      organizational,
      supplier,
      professionalId,
      recurrence,
      occurredAt: dueDate ? zonedDateTime(dueDate, "12:00") : new Date(),
      competenceAt: competenceDate ? zonedDateTime(competenceDate, "12:00") : null,
    },
  });
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function payCommissions(formData?: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };
  const professionalId = formData instanceof FormData ? String(formData.get("professionalId") ?? "") : "";

  const pending = await prisma.commission.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      ...(professionalId ? { professionalId } : {}),
    },
    include: { professional: true },
  });

  const byProfessional = new Map<string, { name: string; total: number }>();
  for (const row of pending) {
    const current = byProfessional.get(row.professionalId) ?? { name: row.professional.name, total: 0 };
    current.total += row.amountCents;
    byProfessional.set(row.professionalId, current);
  }

  await prisma.commission.updateMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      ...(professionalId ? { professionalId } : {}),
    },
    data: { status: "PAID", paidAt: new Date() },
  });

  for (const [id, info] of byProfessional) {
    if (!info.total) continue;
    await prisma.transaction.create({
      data: {
        tenantId: session.tenantId,
        type: "EXPENSE",
        category: "comissao",
        amountCents: info.total,
        method: "PIX",
        account: "caixa",
        professionalId: id,
        description: `Pagamento de comissão para ${info.name}`,
      },
    });
  }

  revalidatePath("/comissoes");
  revalidatePath("/financeiro");
  return { ok: true };
}
