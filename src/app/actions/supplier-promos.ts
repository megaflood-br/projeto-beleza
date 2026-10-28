"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";
import { zonedDateTime } from "@/lib/dates";
import { serializeWeekdays } from "@/lib/promotions";
import { asSupplierDealType } from "@/lib/supplier-promo";

function revalidatePromos() {
  revalidatePath("/fornecedor/promocoes");
  revalidatePath("/fornecedores");
  revalidatePath("/dashboard");
  revalidatePath("/estoque");
}

export async function saveSupplierPromotion(formData: FormData) {
  const { session } = await requireSupplier();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const startsOn = String(formData.get("startsOn") ?? "");
  const endsOn = String(formData.get("endsOn") ?? "");
  const dealType = asSupplierDealType(String(formData.get("dealType") ?? "PERCENT"));
  const productIds = [...new Set(formData.getAll("productId").map(String).filter(Boolean))];
  const buyQty = Math.max(0, Math.round(Number(formData.get("buyQty") ?? 0) || 0));
  const payQty = Math.max(0, Math.round(Number(formData.get("payQty") ?? 0) || 0));
  const rawValue = String(formData.get("discountValue") ?? "0");
  const discountValue =
    dealType === "CENTS" ? parseBRLToCents(rawValue) : Math.min(100, Math.max(0, Math.round(Number(rawValue.replace(",", ".")) || 0)));

  if (!name) return { error: "Dê um nome para a promoção." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return { error: "Informe o período." };
  if (endsOn < startsOn) return { error: "A data final não pode ser antes da inicial." };
  if (!productIds.length) return { error: "Escolha ao menos um produto." };
  if (dealType === "BUNDLE") {
    if (buyQty < 2 || payQty < 1 || payQty >= buyQty) return { error: "No leve e pague, informe por exemplo 5 e 3." };
  } else if (discountValue <= 0) {
    return { error: "Informe o desconto." };
  }

  const owned = await prisma.supplierProduct.findMany({
    where: { id: { in: productIds }, tenantId: session.tenantId },
    select: { id: true },
  });
  if (owned.length !== productIds.length) return { error: "Há produto que não é do seu catálogo." };

  const data = {
    name,
    note,
    startsOn: zonedDateTime(startsOn, "12:00"),
    endsOn: zonedDateTime(endsOn, "12:00"),
    weekdays: serializeWeekdays(formData.getAll("weekday").map((day) => Number(day))),
    dealType,
    discountValue: dealType === "BUNDLE" ? 0 : discountValue,
    buyQty: dealType === "BUNDLE" ? buyQty : 0,
    payQty: dealType === "BUNDLE" ? payQty : 0,
    active: String(formData.get("active") ?? "1") === "1",
  };

  if (id) {
    const existing = await prisma.supplierPromotion.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Promoção não encontrada." };
    await prisma.supplierPromotion.update({ where: { id }, data });
    await prisma.supplierPromotionItem.deleteMany({ where: { promotionId: id } });
    await prisma.supplierPromotionItem.createMany({ data: productIds.map((productId) => ({ promotionId: id, productId })) });
  } else {
    await prisma.supplierPromotion.create({
      data: {
        tenantId: session.tenantId,
        ...data,
        items: { create: productIds.map((productId) => ({ productId })) },
      },
    });
  }
  revalidatePromos();
  return { ok: true as const };
}

export async function deleteSupplierPromotion(formData: FormData) {
  const { session } = await requireSupplier();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.supplierPromotion.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return { error: "Promoção não encontrada." };
  await prisma.supplierPromotion.delete({ where: { id } });
  revalidatePromos();
  return { ok: true as const };
}
