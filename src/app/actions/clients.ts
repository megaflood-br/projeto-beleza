"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { digitsOnly } from "@/lib/utils";
import { zonedDateTime } from "@/lib/dates";
import { cashbackExpiry, pointsToCents } from "@/lib/cashback";
import { safeDispatch } from "@/lib/dispatch-whatsapp-campaign";
import { parseClientIds } from "@/lib/client-delete";
import { deleteTenantClients } from "@/lib/run-client-delete";

function flag(formData: FormData, key: string, fallback = true) {
  const raw = formData.get(key);
  if (raw == null) return fallback;
  return String(raw) !== "0";
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function upsertClient(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const full = String(formData.get("full") ?? "") === "1";
  const name = String(formData.get("name") ?? "").trim();
  const phone = digitsOnly(String(formData.get("phone") ?? ""));
  const email = text(formData, "email");
  const notes = text(formData, "notes");
  const tags = String(formData.get("tags") ?? "").trim();
  const instagram = text(formData, "instagram");
  const birthRaw = String(formData.get("birthDate") ?? "");
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthRaw) ? zonedDateTime(birthRaw, "12:00") : null;

  if (!name || !phone) return { error: "Nome e celular são obrigatórios." };

  try {
    if (id) {
      const existing = await prisma.client.findFirst({ where: { id, tenantId: session.tenantId } });
      if (!existing) return { error: "Cliente não encontrado." };
      const duplicate = await prisma.client.findFirst({
        where: { tenantId: session.tenantId, phone, NOT: { id } },
      });
      if (duplicate) return { error: "Já existe cliente com este telefone." };

      const partial = { name, phone, email, notes, tags, instagram, birthDate };
      const extra = full
        ? {
            nickname: text(formData, "nickname"),
            landline: digitsOnly(String(formData.get("landline") ?? "")) || null,
            facebook: text(formData, "facebook"),
            cnpj: text(formData, "cnpj"),
            cpf: text(formData, "cpf"),
            rg: text(formData, "rg"),
            imageUrl: (() => {
              const url = String(formData.get("imageUrl") ?? "").trim();
              if (url.length > 400_000) return "__too_big__";
              return url || null;
            })(),
            referredById: String(formData.get("referredById") ?? "") || null,
            zip: text(formData, "zip"),
            address: text(formData, "address"),
            addressNumber: text(formData, "addressNumber"),
            complement: text(formData, "complement"),
            district: text(formData, "district"),
            city: text(formData, "city"),
            state: text(formData, "state"),
            defaultDiscountPct: Math.max(0, Math.round(Number(String(formData.get("defaultDiscountPct") ?? "0").replace(",", ".")) || 0)),
            discountTarget: String(formData.get("discountTarget") ?? "comanda") === "servico" ? "servico" : "comanda",
            active: flag(formData, "active"),
            notifications: flag(formData, "notifications"),
            blockAccess: flag(formData, "blockAccess", false),
          }
        : {};
      if ("imageUrl" in extra && extra.imageUrl === "__too_big__") {
        return { error: "Imagem muito grande. Use uma foto menor." };
      }
      if (full && (String(formData.get("referredById") ?? "") || null) === id) {
        return { error: "O cliente não pode ser indicado por ele mesmo." };
      }
      await prisma.client.update({ where: { id }, data: { ...partial, ...extra } });
    } else {
      const duplicate = await prisma.client.findFirst({
        where: { tenantId: session.tenantId, phone },
      });
      if (duplicate) return { error: "Já existe cliente com este telefone." };
      const imageUrl = String(formData.get("imageUrl") ?? "").trim();
      if (imageUrl.length > 400_000) return { error: "Imagem muito grande. Use uma foto menor." };
      const created = await prisma.client.create({
        data: {
          tenantId: session.tenantId,
          name,
          phone,
          email,
          notes,
          tags,
          instagram,
          birthDate,
          source: "balcao",
          nickname: text(formData, "nickname"),
          landline: digitsOnly(String(formData.get("landline") ?? "")) || null,
          facebook: text(formData, "facebook"),
          cnpj: text(formData, "cnpj"),
          cpf: text(formData, "cpf"),
          rg: text(formData, "rg"),
          imageUrl: imageUrl || null,
          referredById: String(formData.get("referredById") ?? "") || null,
          zip: text(formData, "zip"),
          address: text(formData, "address"),
          addressNumber: text(formData, "addressNumber"),
          complement: text(formData, "complement"),
          district: text(formData, "district"),
          city: text(formData, "city"),
          state: text(formData, "state"),
          defaultDiscountPct: Math.max(0, Math.round(Number(String(formData.get("defaultDiscountPct") ?? "0").replace(",", ".")) || 0)),
          discountTarget: String(formData.get("discountTarget") ?? "comanda") === "servico" ? "servico" : "comanda",
          active: flag(formData, "active"),
          notifications: flag(formData, "notifications"),
          blockAccess: flag(formData, "blockAccess", false),
        },
      });
      safeDispatch({
        tenantId: session.tenantId,
        trigger: "WELCOME",
        client: { id: created.id, name: created.name, phone: created.phone },
        sentOn: created.id,
      });
    }
  } catch (err) {
    console.error("upsertClient", err);
    return { error: "Não foi possível salvar o cliente. Confira os campos e tente de novo." };
  }

  revalidatePath("/clientes");
  if (id) revalidatePath(`/clientes/${id}`);
  revalidatePath("/agenda");
  return { ok: true };
}

export async function addManualCashback(formData: FormData) {
  const { session, tenant } = await requireTenant();
  if (!tenant.cashbackEnabled) return { error: "Ative o módulo de cashback em Configurações." };
  const clientId = String(formData.get("clientId") ?? "");
  const points = Math.round(Number(String(formData.get("points") ?? "").replace(",", ".")));
  const reason = String(formData.get("reason") ?? "").trim() || "Lançamento manual";
  if (!clientId) return { error: "Cliente não encontrado." };
  if (!Number.isFinite(points) || points === 0) return { error: "Informe a quantidade de pontos." };

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: session.tenantId } });
  if (!client) return { error: "Cliente não encontrado." };

  const amountCents = pointsToCents(points, tenant.cashbackCentsPerPoint);
  const nextBalance = client.cashbackCents + amountCents;
  if (nextBalance < 0) return { error: "O saldo de cashback não pode ficar negativo." };

  await prisma.$transaction([
    prisma.client.update({
      where: { id: client.id },
      data: { cashbackCents: nextBalance },
    }),
    prisma.cashbackMovement.create({
      data: {
        tenantId: session.tenantId,
        clientId: client.id,
        type: "MANUAL",
        amountCents,
        points,
        reason,
        createdById: session.userId,
        createdByName: session.name,
        expiresAt: amountCents > 0 ? cashbackExpiry(tenant.cashbackExpireDays) : null,
      },
    }),
  ]);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${client.id}`);
  return { ok: true as const };
}

export async function deleteClients(formData: FormData) {
  const { session } = await requireTenant();
  const scope = String(formData.get("scope") ?? "ids");
  const requested = parseClientIds(String(formData.get("ids") ?? ""));

  const rows = await prisma.client.findMany({
    where: scope === "all" ? { tenantId: session.tenantId } : { tenantId: session.tenantId, id: { in: requested } },
    select: { id: true },
  });
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return { error: "Nenhum cliente para excluir." };

  try {
    const deleted = await deleteTenantClients(session.tenantId, ids);
    try {
      revalidatePath("/clientes");
      revalidatePath("/agenda");
      revalidatePath("/comandas");
    } catch {
      /* cache miss after a successful delete should not hide the result */
    }
    return { ok: true as const, deleted };
  } catch (error) {
    console.error("deleteClients", error);
    const detail = error instanceof Error ? error.message : "";
    if (/FOREIGN KEY|foreign key/i.test(detail)) {
      return { error: "Este cliente tem histórico que impede a exclusão. Feche comandas ligadas e tente de novo." };
    }
    return { error: detail ? `Não foi possível excluir: ${detail}` : "Não foi possível excluir os clientes. Tente de novo." };
  }
}
