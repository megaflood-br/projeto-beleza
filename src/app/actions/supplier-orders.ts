"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSupplier, requireTenant } from "@/lib/tenant";
import { nextStock } from "@/lib/stock";
import {
  asSupplierPayMethod,
  canChangeSupplierOrder,
  canReceiveSupplierOrder,
  makeSupplierOrderCode,
  orderLineCents,
  orderTotalCents,
  parseOrderQty,
  parseSupplierPayMethods,
  quoteSupplierFulfillment,
} from "@/lib/supplier-market";
import { supplierServesSalon } from "@/lib/br-cities";

function revalidateOrders() {
  revalidatePath("/fornecedor");
  revalidatePath("/fornecedor/pedidos");
  revalidatePath("/fornecedores");
}

async function uniquePickupCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const pickupCode = makeSupplierOrderCode();
    const taken = await prisma.supplierOrder.findUnique({ where: { pickupCode } });
    if (!taken) return pickupCode;
  }
  return `${makeSupplierOrderCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

export async function placeSupplierOrder(formData: FormData) {
  const { session, tenant } = await requireTenant();
  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  if (!productIds.length) return { error: "Inclua pelo menos um produto." };

  const products = await prisma.supplierProduct.findMany({
    where: { id: { in: productIds }, active: true, tenant: { kind: "SUPPLIER", status: { not: "SUSPENDED" } } },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          deliveryMinCents: true,
          deliveryFeeCents: true,
          supplierPayMethods: true,
          servedCities: true,
        },
      },
    },
  });
  if (!products.length) return { error: "Nenhum produto válido no pedido." };

  const grouped = new Map<string, { supplier: (typeof products)[number]["tenant"]; items: { product: (typeof products)[number]; quantity: number }[] }>();
  for (const [index, productId] of productIds.entries()) {
    const product = products.find((row) => row.id === productId);
    if (!product) continue;
    const quantity = Math.max(parseOrderQty(quantities[index] ?? "1", product.minQty), product.minQty);
    if (product.stock != null && quantity > product.stock) {
      return { error: `Estoque insuficiente de ${product.name} em ${product.tenant.name}.` };
    }
    const group = grouped.get(product.tenantId) ?? { supplier: product.tenant, items: [] };
    group.items.push({ product, quantity });
    grouped.set(product.tenantId, group);
  }
  if (!grouped.size) return { error: "Nenhum produto válido no pedido." };

  const salonAddress = [tenant.address, tenant.city].filter(Boolean).join(" · ") || null;

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
    const subtotalCents = orderTotalCents(lines);
    const fulfillment = String(formData.get(`fulfillment_${supplierTenantId}`) ?? "PICKUP");
    const paymentMethod = asSupplierPayMethod(String(formData.get(`payment_${supplierTenantId}`) ?? "")) ?? parseSupplierPayMethods(group.supplier.supplierPayMethods)[0];
    const allowed = parseSupplierPayMethods(group.supplier.supplierPayMethods);
    if (!allowed.includes(paymentMethod)) return { error: `Forma de pagamento inválida em ${group.supplier.name}.` };
    if (!supplierServesSalon(group.supplier.servedCities, tenant.city)) {
      return { error: `${group.supplier.name} não atende a região do salão.` };
    }
    const quote = quoteSupplierFulfillment({
      subtotalCents,
      fulfillment,
      deliveryMinCents: group.supplier.deliveryMinCents,
      deliveryFeeCents: group.supplier.deliveryFeeCents,
    });
    if (!quote.ok) return { error: `${group.supplier.name}: ${quote.error}` };
    const notes = String(formData.get(`notes_${supplierTenantId}`) ?? formData.get("notes") ?? "").trim() || null;
    await prisma.supplierOrder.create({
      data: {
        salonTenantId: session.tenantId,
        supplierTenantId,
        createdById: session.userId,
        notes,
        fulfillment: quote.fulfillment,
        paymentMethod,
        paymentWhen: "ON_FULFILLMENT",
        subtotalCents,
        deliveryFeeCents: quote.feeCents,
        totalCents: quote.totalCents,
        pickupCode: await uniquePickupCode(),
        salonAddress,
        salonPhone: tenant.phone,
        pickupAddress: [group.supplier.address, group.supplier.city].filter(Boolean).join(" · ") || null,
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
            reason: `Pedido ${order.pickupCode ?? order.id.slice(-6).toUpperCase()} · ${order.supplierTenant.name}`,
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
        reason: `Pedido ${order.pickupCode ?? order.id.slice(-6).toUpperCase()} · ${order.supplierTenant.name}`,
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
