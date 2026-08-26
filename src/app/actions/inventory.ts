"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { nextStock } from "@/lib/stock";
import { parseBRLToCents } from "@/lib/money";

export async function upsertProduct(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "") || null;
  const unit = String(formData.get("unit") ?? "un");
  const stock = Number(formData.get("stock") ?? 0);
  const minStock = Number(formData.get("minStock") ?? 2);
  const costCents = parseBRLToCents(String(formData.get("cost") ?? "0"));
  const saleCents = parseBRLToCents(String(formData.get("sale") ?? "0"));

  if (!name) return { error: "Nome é obrigatório." };

  if (id) {
    await prisma.product.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { name, sku, unit, stock, minStock, costCents, saleCents },
    });
  } else {
    await prisma.product.create({
      data: {
        tenantId: session.tenantId,
        name,
        sku,
        unit,
        stock,
        minStock,
        costCents,
        saleCents,
      },
    });
  }
  revalidatePath("/estoque");
  return { ok: true };
}

export async function moveStock(formData: FormData) {
  const { session } = await requireTenant();
  const productId = String(formData.get("productId") ?? "");
  const type = String(formData.get("type") ?? "IN") as "IN" | "OUT" | "ADJUST";
  const quantity = Number(formData.get("quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "") || null;

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: session.tenantId },
  });
  if (!product) return { error: "Produto não encontrado." };

  const stock = nextStock(product.stock, type, quantity);
  await prisma.product.update({ where: { id: product.id }, data: { stock } });
  await prisma.stockMovement.create({
    data: {
      tenantId: session.tenantId,
      productId: product.id,
      type,
      quantity,
      reason,
    },
  });
  revalidatePath("/estoque");
  return { ok: true };
}
