"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";

export async function upsertService(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const durationMin = Number(formData.get("durationMin") ?? 30);
  const priceCents = parseBRLToCents(String(formData.get("price") ?? "0"));
  const extraCostCents = parseBRLToCents(String(formData.get("extraCost") ?? "0"));
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const commissionRaw = String(formData.get("commissionPct") ?? "").replace(",", ".");
  const commissionPct = commissionRaw ? Number(commissionRaw) : null;
  const cashbackRaw = String(formData.get("cashbackPct") ?? "").replace(",", ".");
  const cashbackPct = cashbackRaw ? Number(cashbackRaw) : null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const aftercare = String(formData.get("aftercare") ?? "").trim() || null;
  const returnAfterDays = Number(formData.get("returnAfterDays") ?? 0) || null;
  const priceType = String(formData.get("priceType") ?? "fixed") === "from" ? "from" : "fixed";
  const color = String(formData.get("color") ?? "#6366F1");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const active = String(formData.get("active") ?? "") !== "0";
  const onlineBooking = String(formData.get("onlineBooking") ?? "") !== "0";
  const favorite = String(formData.get("favorite") ?? "") === "1";

  if (!name) return { error: "Nome do serviço é obrigatório." };

  const productIds = formData.getAll("consumedProductId").map(String);
  const productQtys = formData.getAll("consumedQty").map(String);
  const products = productIds
    .map((productId, index) => ({
      productId,
      quantity: Number(productQtys[index] ?? 1) || 1,
    }))
    .filter((row) => row.productId);

  const data = {
    name,
    durationMin,
    priceCents,
    extraCostCents,
    categoryId,
    commissionPct,
    cashbackPct,
    description,
    aftercare,
    returnAfterDays,
    priceType,
    color,
    imageUrl,
    active,
    onlineBooking,
    favorite,
  };

  if (id) {
    const existing = await prisma.service.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Serviço não encontrado." };
    await prisma.service.update({ where: { id }, data });
    await prisma.serviceProduct.deleteMany({ where: { serviceId: id } });
    if (products.length) {
      await prisma.serviceProduct.createMany({
        data: products.map((row) => ({ serviceId: id, productId: row.productId, quantity: row.quantity })),
      });
    }
  } else {
    const created = await prisma.service.create({
      data: { tenantId: session.tenantId, ...data },
    });
    if (products.length) {
      await prisma.serviceProduct.createMany({
        data: products.map((row) => ({ serviceId: created.id, productId: row.productId, quantity: row.quantity })),
      });
    }
  }
  revalidatePath("/servicos");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function toggleService(id: string, active: boolean) {
  const { session } = await requireTenant();
  await prisma.service.updateMany({
    where: { id, tenantId: session.tenantId },
    data: { active },
  });
  revalidatePath("/servicos");
  return { ok: true };
}

export async function toggleServiceFavorite(id: string) {
  const { session } = await requireTenant();
  const service = await prisma.service.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { favorite: true },
  });
  if (!service) return { error: "Serviço não encontrado." };
  await prisma.service.update({ where: { id }, data: { favorite: !service.favorite } });
  revalidatePath("/servicos");
  return { ok: true };
}
