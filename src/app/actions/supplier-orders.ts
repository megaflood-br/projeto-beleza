"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSupplier, requireTenant } from "@/lib/tenant";
import { nextStock } from "@/lib/stock";
import {
  canChangeSupplierOrder,
  canReceiveSupplierOrder,
  orderLineCents,
  orderTotalCents,
  parseOrderQty,
} from "@/lib/supplier-market";

function revalidateOrders() {
  revalidatePath("/fornecedor");
  revalidatePath("/fornecedor/pedidos");
  revalidatePath("/fornecedores");
}

export async function placeSupplierOrder(formData: FormData) {
  const { session } = await requireTenant();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  if (!productIds.length) return { error: "Inclua pelo menos um produto." };

  const products = await prisma.supplierProduct.findMany({
    where: { id: { in: productIds }, active: true, tenant: { kind: "SUPPLIER", status: { not: "SUSPENDED" } } },
    include: { tenant: { select: { id: true, name: true } } },
  });
  if (!products.length) return { error: "Nenhum produto válido no pedido." };

  const grouped = new Map<string, { supplierName: string; items: { product: (typeof products)[number]; quantity: number }[] }>();
  for (const [index, productId] of productIds.entries()) {
    const product = products.find((row) => row.id === productId);
    if (!product) continue;
    const quantity = Math.max(parseOrderQty(quantities[index] ?? "1", product.minQty), product.minQty);
    if (product.stock != null && quantity > product.stock) {
      return { error: `Estoque insuficiente de ${product.name} em ${product.tenant.name}.` };
    }
    const group = grouped.get(product.tenantId) ?? { supplierName: product.tenant.name, items: [] };
    group.items.push({ product, quantity });
    grouped.set(product.tenantId, group);
  }
  if (!grouped.size) return { error: "Nenhum produto válido no pedido." };

  for (const [supplierTenantId, group] of grouped) {
    const lines = group.items.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      unit: product.unit,
      quantity,
      unitCents: product.priceCents,
      lineCents: orderLineCents(quantity, product.priceCents),
    }));
    await prisma.supplierOrder.create({
      data: {
        salonTenantId: session.tenantId,
        supplierTenantId,
        createdById: session.userId,
        notes,
        totalCents: orderTotalCents(lines),
        items: { create: lines },
      },
    });
  }

  revalidateOrders();
  return { ok: true };
}

export async function changeSupplierOrderStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const actor = String(formData.get("actor") ?? "");

  if (actor === "supplier") {
    const { session } = await requireSupplier();
    const order = await prisma.supplierOrder.findFirst({
      where: { id, supplierTenantId: session.tenantId },
      include: { items: true },
    });
    if (!order) return { error: "Pedido não encontrado." };
    if (!canChangeSupplierOrder(order.status, status, "supplier")) return { error: "Não é possível alterar este pedido." };
    if (status === "CONFIRMED") {
      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await prisma.supplierProduct.findFirst({
          where: { id: item.productId, tenantId: session.tenantId },
        });
        if (product?.stock != null && product.stock < item.quantity) {
          return { error: `Estoque insuficiente de ${item.name}.` };
        }
      }
      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await prisma.supplierProduct.findFirst({
          where: { id: item.productId, tenantId: session.tenantId },
        });
        if (product?.stock == null) continue;
        await prisma.supplierProduct.update({
          where: { id: product.id },
          data: { stock: product.stock - item.quantity },
        });
      }
    }
    await prisma.supplierOrder.update({ where: { id: order.id }, data: { status } });
    revalidateOrders();
    return { ok: true };
  }

  const { session } = await requireTenant();
  const order = await prisma.supplierOrder.findFirst({ where: { id, salonTenantId: session.tenantId } });
  if (!order) return { error: "Pedido não encontrado." };
  if (!canChangeSupplierOrder(order.status, status, "salon")) return { error: "Não é possível cancelar este pedido." };
  await prisma.supplierOrder.update({ where: { id: order.id }, data: { status } });
  revalidateOrders();
  return { ok: true };
}

export async function receiveSupplierOrder(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const order = await prisma.supplierOrder.findFirst({
    where: { id, salonTenantId: session.tenantId },
    include: { items: true, supplierTenant: { select: { name: true } } },
  });
  if (!order) return { error: "Pedido não encontrado." };
  if (!canReceiveSupplierOrder(order.status, order.receivedAt)) {
    return { error: "Este pedido ainda não pode entrar no estoque." };
  }

  for (const item of order.items) {
    const existing = await prisma.product.findFirst({
      where: {
        tenantId: session.tenantId,
        name: item.name,
        brand: item.brand,
      },
    });
    if (existing) {
      const stock = nextStock(existing.stock, "IN", item.quantity);
      await prisma.$transaction([
        prisma.product.update({ where: { id: existing.id }, data: { stock, costCents: item.unitCents } }),
        prisma.stockMovement.create({
          data: {
            tenantId: session.tenantId,
            productId: existing.id,
            type: "IN",
            quantity: item.quantity,
            reason: `Pedido ${order.id.slice(-6).toUpperCase()} · ${order.supplierTenant.name}`,
          },
        }),
      ]);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        tenantId: session.tenantId,
        name: item.name,
        brand: item.brand,
        sku: item.sku,
        unit: item.unit,
        costCents: item.unitCents,
        saleCents: item.unitCents,
        stock: item.quantity,
        requestAvailable: true,
        active: true,
      },
    });
    await prisma.stockMovement.create({
      data: {
        tenantId: session.tenantId,
        productId: created.id,
        type: "IN",
        quantity: item.quantity,
        reason: `Pedido ${order.id.slice(-6).toUpperCase()} · ${order.supplierTenant.name}`,
      },
    });
  }

  await prisma.supplierOrder.update({
    where: { id: order.id },
    data: { receivedAt: new Date(), status: order.status === "SHIPPED" ? "DELIVERED" : order.status },
  });
  revalidateOrders();
  revalidatePath("/estoque");
  return { ok: true };
}
