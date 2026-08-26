"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/money";

export async function createTransaction(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };

  const type = String(formData.get("type") ?? "INCOME");
  const category = String(formData.get("category") ?? "outros");
  const amountCents = parseBRLToCents(String(formData.get("amount") ?? "0"));
  const method = String(formData.get("method") ?? "PIX");
  const description = String(formData.get("description") ?? "") || null;

  if (!amountCents) return { error: "Informe um valor." };

  await prisma.transaction.create({
    data: {
      tenantId: session.tenantId,
      type,
      category,
      amountCents,
      method,
      description,
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

  await prisma.commission.updateMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      ...(professionalId ? { professionalId } : {}),
    },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/comissoes");
  return { ok: true };
}
