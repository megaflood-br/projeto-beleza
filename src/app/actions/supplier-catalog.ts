"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSupplier } from "@/lib/tenant";
import { parseBRLToCents } from "@/lib/money";
import { parseOrderQty, serializeSupplierPayMethods } from "@/lib/supplier-market";

function revalidateCatalog() {
  revalidatePath("/fornecedor");
  revalidatePath("/fornecedores");
}

export async function saveSupplierProfile(formData: FormData) {
  const { session, tenant } = await requireSupplier();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const deliveryMinCents = Math.max(parseBRLToCents(String(formData.get("deliveryMin") ?? "0")), 0);
  const deliveryFeeCents = Math.max(parseBRLToCents(String(formData.get("deliveryFee") ?? "0")), 0);
  const supplierPayMethods = serializeSupplierPayMethods(formData.getAll("payMethod").map(String));
  if (!name) return { error: "Informe o nome da empresa." };
  void tenant;
  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: { name, phone, email, city, address, deliveryMinCents, deliveryFeeCents, supplierPayMethods },
  });
  revalidateCatalog();
  revalidatePath("/fornecedor/empresa");
  return { ok: true };
}

export async function saveSupplierProduct(formData: FormData) {
  const { session } = await requireSupplier();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const unit = ["ml", "g"].includes(String(formData.get("unit") ?? "")) ? String(formData.get("unit")) : "un";
  const priceCents = parseBRLToCents(String(formData.get("price") ?? "0"));
  const minQty = Math.max(parseOrderQty(String(formData.get("minQty") ?? "1"), 1), 0.01);
  const stockRaw = String(formData.get("stock") ?? "").trim();
  const stock = stockRaw === "" ? null : Math.max(parseOrderQty(stockRaw, 0), 0);
  const description = String(formData.get("description") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const active = String(formData.get("active") ?? "") !== "0";

  if (!name) return { error: "Informe o nome do produto." };
  if (priceCents <= 0) return { error: "Informe o preço de venda." };
  if (imageUrl && imageUrl.length > 400_000) return { error: "Imagem muito grande. Use uma foto menor." };

  const data = { name, brand, sku, category, unit, priceCents, minQty, stock, description, imageUrl, active };
  if (id) {
    const existing = await prisma.supplierProduct.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Produto não encontrado." };
    await prisma.supplierProduct.update({ where: { id }, data });
  } else {
    await prisma.supplierProduct.create({ data: { ...data, tenantId: session.tenantId } });
  }
  revalidateCatalog();
  return { ok: true };
}

export async function deleteSupplierProduct(formData: FormData) {
  const { session } = await requireSupplier();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.supplierProduct.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return { error: "Produto não encontrado." };
  await prisma.supplierProduct.update({ where: { id }, data: { active: false } });
  revalidateCatalog();
  return { ok: true };
}
