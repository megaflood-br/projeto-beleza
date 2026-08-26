"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { digitsOnly } from "@/lib/utils";
import { zonedDateTime } from "@/lib/dates";

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
      await prisma.client.create({
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
