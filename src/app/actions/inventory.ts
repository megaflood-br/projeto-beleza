"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { nextStock } from "@/lib/stock";
import { parseBRLToCents } from "@/lib/money";
import { zonedDateTime } from "@/lib/dates";

function toNullableInt(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "")
    .replace("%", "")
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function toNumber(raw: FormDataEntryValue | null, fallback = 0) {
  const value = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

export async function upsertProduct(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const unit = ["ml", "g"].includes(String(formData.get("unit") ?? "")) ? String(formData.get("unit")) : "un";
  const unitEquals = Math.max(toNumber(formData.get("unitEquals"), 1), 0.01);
  const costCents = parseBRLToCents(String(formData.get("cost") ?? "0"));
  const saleCents = parseBRLToCents(String(formData.get("sale") ?? "0"));
  const professionalPriceCents = parseBRLToCents(String(formData.get("professionalPrice") ?? "0"));
  const extraCostCents = parseBRLToCents(String(formData.get("extraCost") ?? "0"));
  const commissionPct = toNullableInt(formData.get("commissionPct"));
  const cashbackPct = toNullableInt(formData.get("cashbackPct"));
  const returnRaw = Number(formData.get("returnAfterDays") ?? "");
  const returnAfterDays = Number.isFinite(returnRaw) && returnRaw > 0 ? returnRaw : null;
  const minStock = Math.max(toNumber(formData.get("minStock"), 0), 0);
  const initialStock = Math.max(toNumber(formData.get("stock"), 0), 0);
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const requestAvailable = String(formData.get("requestAvailable") ?? "") !== "0";
  const active = String(formData.get("active") ?? "") !== "0";

  if (!name) return { error: "Nome do produto é obrigatório." };
  if (imageUrl && imageUrl.length > 400_000) {
    return { error: "Imagem muito grande. Use uma foto menor." };
  }

  const serviceIds = formData.getAll("linkedServiceId").map(String);
  const serviceQtys = formData.getAll("linkedQty").map(String);
  const services = serviceIds
    .map((serviceId, index) => ({
      serviceId,
      quantity: Number(serviceQtys[index] ?? 1) || 1,
    }))
    .filter((row) => row.serviceId);

  const data = {
    name,
    sku,
    barcode,
    brand,
    categoryId,
    unit,
    unitEquals,
    costCents,
    saleCents,
    professionalPriceCents,
    extraCostCents,
    commissionPct,
    cashbackPct,
    returnAfterDays,
    minStock,
    imageUrl,
    notes,
    requestAvailable,
    active,
  };

  try {
    if (id) {
      const existing = await prisma.product.findFirst({ where: { id, tenantId: session.tenantId } });
      if (!existing) return { error: "Produto não encontrado." };
      await prisma.product.update({ where: { id }, data });
      await prisma.serviceProduct.deleteMany({ where: { productId: id } });
      if (services.length) {
        await prisma.serviceProduct.createMany({
          data: services.map((row) => ({ productId: id, serviceId: row.serviceId, quantity: row.quantity })),
        });
      }
    } else {
      const created = await prisma.product.create({
        data: { tenantId: session.tenantId, stock: initialStock, ...data },
      });
      if (initialStock > 0) {
        await prisma.stockMovement.create({
          data: {
            tenantId: session.tenantId,
            productId: created.id,
            type: "IN",
            quantity: initialStock,
            reason: "Estoque inicial",
          },
        });
      }
      if (services.length) {
        await prisma.serviceProduct.createMany({
          data: services.map((row) => ({ productId: created.id, serviceId: row.serviceId, quantity: row.quantity })),
        });
      }
    }
  } catch (err) {
    console.error("upsertProduct", err);
    return { error: "Não foi possível salvar o produto. Confira os campos e tente de novo." };
  }
  revalidatePath("/estoque");
  revalidatePath("/servicos");
  return { ok: true };
}

export async function moveStock(formData: FormData) {
  const { session } = await requireTenant();
  const productId = String(formData.get("productId") ?? "");
  const type = String(formData.get("type") ?? "IN") as "IN" | "OUT" | "ADJUST";
  const quantity = toNumber(formData.get("quantity"), 0);
  const reason = String(formData.get("reason") ?? "") || null;

  if (quantity <= 0) return { error: "Informe uma quantidade." };

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

export async function createProductLot(formData: FormData) {
  const { session } = await requireTenant();
  const productId = String(formData.get("productId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const quantity = toNumber(formData.get("quantity"), 0);
  const expires = String(formData.get("expiresAt") ?? "");

  if (!productId) return { error: "Selecione o produto." };
  if (!code) return { error: "Informe o código do lote." };
  if (quantity <= 0) return { error: "Informe a quantidade." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) return { error: "Informe a validade." };

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId: session.tenantId } });
  if (!product) return { error: "Produto não encontrado." };

  await prisma.productLot.create({
    data: {
      tenantId: session.tenantId,
      productId,
      code,
      quantity,
      expiresAt: zonedDateTime(expires, "12:00"),
    },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { stock: product.stock + quantity },
  });
  await prisma.stockMovement.create({
    data: {
      tenantId: session.tenantId,
      productId,
      type: "IN",
      quantity,
      reason: `Lote ${code}`,
    },
  });
  revalidatePath("/estoque");
  return { ok: true };
}

export async function createProductRequest(formData: FormData) {
  const { session } = await requireTenant();
  const productId = String(formData.get("productId") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const quantity = toNumber(formData.get("quantity"), 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productId) return { error: "Selecione o produto." };
  if (quantity <= 0) return { error: "Informe a quantidade." };

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId: session.tenantId } });
  if (!product) return { error: "Produto não encontrado." };
  if (!product.requestAvailable) return { error: "Este produto não está disponível para solicitação." };

  await prisma.productRequest.create({
    data: {
      tenantId: session.tenantId,
      productId,
      professionalId,
      quantity,
      notes,
    },
  });
  revalidatePath("/estoque");
  return { ok: true };
}

export async function reviewProductRequest(id: string, status: "APPROVED" | "REJECTED") {
  const { session } = await requireTenant();
  const request = await prisma.productRequest.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { product: true },
  });
  if (!request) return { error: "Solicitação não encontrada." };
  if (request.status !== "PENDING") return { error: "Esta solicitação já foi respondida." };

  if (status === "APPROVED") {
    if (request.product.stock < request.quantity) {
      return { error: "Estoque insuficiente para aprovar a solicitação." };
    }
    await prisma.product.update({
      where: { id: request.productId },
      data: { stock: request.product.stock - request.quantity },
    });
    await prisma.stockMovement.create({
      data: {
        tenantId: session.tenantId,
        productId: request.productId,
        type: "OUT",
        quantity: request.quantity,
        reason: "Solicitação aprovada",
      },
    });
  }

  await prisma.productRequest.update({ where: { id }, data: { status } });
  revalidatePath("/estoque");
  return { ok: true };
}
