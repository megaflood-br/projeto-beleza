"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { parseBRLToCents } from "@/lib/money";
import { zonedDateTime } from "@/lib/dates";
import { serializeWeekdays } from "@/lib/promotions";

function revalidatePromos() {
  revalidatePath("/promocoes");
  revalidatePath("/comandas");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/agendar", "layout");
}

export async function savePromotion(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startsOn = String(formData.get("startsOn") ?? "");
  const endsOn = String(formData.get("endsOn") ?? "");
  const discountType = String(formData.get("discountType") ?? "PERCENT") === "CENTS" ? "CENTS" : "PERCENT";
  const rawValue = String(formData.get("discountValue") ?? "0");
  const discountValue =
    discountType === "CENTS" ? parseBRLToCents(rawValue) : Math.min(100, Math.max(0, Math.round(Number(rawValue.replace(",", ".")) || 0)));
  const weekdays = serializeWeekdays(formData.getAll("weekday").map((day) => Number(day)));
  const types = formData.getAll("itemType").map(String);
  const ids = formData.getAll("itemId").map(String);
  const items = types
    .map((type, index) => ({
      type: type === "PRODUCT" ? "PRODUCT" : "SERVICE",
      serviceId: type === "PRODUCT" ? null : ids[index] || null,
      productId: type === "PRODUCT" ? ids[index] || null : null,
    }))
    .filter((item) => item.serviceId || item.productId);

  if (!name) return { error: "Dê um nome para a promoção." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return { error: "Informe o período." };
  if (endsOn < startsOn) return { error: "A data final não pode ser antes da inicial." };
  if (!items.length) return { error: "Inclua ao menos um serviço ou produto." };
  if (discountValue <= 0) return { error: "Informe o desconto." };

  const data = {
    name,
    startsOn: zonedDateTime(startsOn, "12:00"),
    endsOn: zonedDateTime(endsOn, "12:00"),
    weekdays,
    discountType,
    discountValue,
    active: String(formData.get("active") ?? "1") === "1",
  };

  if (id) {
    const existing = await prisma.promotion.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Promoção não encontrada." };
    await prisma.promotion.update({ where: { id }, data });
    await prisma.promotionItem.deleteMany({ where: { promotionId: id } });
    await prisma.promotionItem.createMany({ data: items.map((item) => ({ promotionId: id, ...item })) });
  } else {
    await prisma.promotion.create({
      data: {
        tenantId: session.tenantId,
        ...data,
        items: { create: items },
      },
    });
  }

  revalidatePromos();
  return { ok: true as const };
}

export async function deletePromotion(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.promotion.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return { error: "Promoção não encontrada." };
  await prisma.promotion.delete({ where: { id } });
  revalidatePromos();
  return { ok: true as const };
}
