"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";
import { saveTenantLogo } from "@/lib/product-upload";
import { createManualCommission } from "@/lib/partner-commission";

function revalidateFinance() {
  revalidatePath("/plataforma/comissoes");
  revalidatePath("/plataforma/canais");
  revalidatePath("/parceiro");
  revalidatePath("/parceiro/financeiro");
}

export async function adjustPartnerCommission(formData: FormData) {
  await requirePlatformAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const amountCents = parseBRLToCents(String(formData.get("amount") ?? ""));
  if (!partnerId) return { error: "Selecione o parceiro." };
  if (!amountCents) return { error: "Informe um valor." };
  await createManualCommission({
    partnerId,
    type: amountCents > 0 ? "BONUS" : "ADJUST",
    amountCents,
    note: note || (amountCents > 0 ? "Bônus manual" : "Ajuste manual"),
  });
  revalidateFinance();
  return { ok: true as const };
}

export async function payPartnerPayout(formData: FormData) {
  const { session } = await requirePlatformAdmin();
  const partnerId = String(formData.get("partnerId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const receiptRaw = String(formData.get("receiptUrl") ?? "").trim();
  if (!partnerId) return { error: "Selecione o parceiro." };

  const available = await prisma.partnerCommission.findMany({
    where: { partnerId, status: "AVAILABLE" },
  });
  const amountCents = available.reduce((sum, row) => sum + row.commissionCents, 0);
  if (amountCents <= 0) return { error: "Não há saldo disponível para este parceiro." };

  const receiptUrl = receiptRaw ? await saveTenantLogo(`payout-${partnerId}`, receiptRaw, null) : null;
  const payout = await prisma.partnerPayout.create({
    data: {
      partnerId,
      amountCents,
      status: "PAID",
      receiptUrl,
      paidAt: new Date(),
      paidById: session.userId,
      note: note || "Repasse marcado como pago",
    },
  });
  await prisma.partnerCommission.updateMany({
    where: { id: { in: available.map((row) => row.id) } },
    data: { status: "PAID", paidAt: new Date(), payoutId: payout.id },
  });
  revalidateFinance();
  return { ok: true as const };
}
