"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam, hashPassword } from "@/lib/auth";
import { ROLES, type Role } from "@/lib/constants";
import { digitsOnly } from "@/lib/utils";
import { zonedDateTime } from "@/lib/dates";

function toInt(raw: FormDataEntryValue | null, fallback: number) {
  const value = Number(String(raw ?? "").replace(",", ".").replace("%", ""));
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function flag(formData: FormData, key: string, fallback = true) {
  const raw = formData.get(key);
  if (raw == null) return fallback;
  return String(raw) !== "0";
}

export async function upsertProfessional(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const specialty = String(formData.get("specialty") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#2563EB");
  const commissionPct = Math.min(100, Math.max(0, toInt(formData.get("commissionPct"), 40)));
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw ? digitsOnly(phoneRaw) || null : null;
  const workStart = String(formData.get("workStart") ?? "09:00") || "09:00";
  const workEnd = String(formData.get("workEnd") ?? "19:00") || "19:00";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const birthRaw = String(formData.get("birthDate") ?? "");
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthRaw) ? zonedDateTime(birthRaw, "12:00") : null;
  const document = String(formData.get("document") ?? "").trim() || null;
  const rg = String(formData.get("rg") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const zip = String(formData.get("zip") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const addressNumber = String(formData.get("addressNumber") ?? "").trim() || null;
  const complement = String(formData.get("complement") ?? "").trim() || null;
  const district = String(formData.get("district") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const active = flag(formData, "active");
  const onlineBooking = flag(formData, "onlineBooking");
  const generateAgenda = flag(formData, "generateAgenda");
  const receivesCommission = flag(formData, "receivesCommission");
  const isStockist = flag(formData, "isStockist", false);
  const salonPartner = flag(formData, "salonPartner", false);
  const serviceIds = formData.getAll("serviceId").map(String).filter(Boolean);

  if (!name) return { error: "Nome é obrigatório." };
  if (!phone) return { error: "Celular é obrigatório." };
  if (imageUrl && imageUrl.length > 400_000) {
    return { error: "Imagem muito grande. Use uma foto menor." };
  }

  const data = {
    name,
    nickname,
    specialty,
    color,
    commissionPct,
    phone,
    workStart,
    workEnd,
    imageUrl,
    birthDate,
    document,
    rg,
    notes,
    zip,
    address,
    addressNumber,
    complement,
    district,
    city,
    state,
    active,
    onlineBooking,
    generateAgenda,
    receivesCommission,
    isStockist,
    salonPartner,
  };

  try {
    let professionalId = id;
    if (id) {
      const existing = await prisma.professional.findFirst({ where: { id, tenantId: session.tenantId } });
      if (!existing) return { error: "Profissional não encontrado." };
      await prisma.professional.update({ where: { id }, data });
    } else {
      const last = await prisma.professional.aggregate({
        where: { tenantId: session.tenantId },
        _max: { sortOrder: true },
      });
      const created = await prisma.professional.create({
        data: {
          tenantId: session.tenantId,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
          ...data,
        },
      });
      professionalId = created.id;
    }

    await prisma.professionalService.deleteMany({ where: { professionalId } });
    if (serviceIds.length) {
      await prisma.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId, serviceId })),
      });
    }

    const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
    const userRole = String(formData.get("userRole") ?? "PROFESSIONAL") as Role;
    const userPassword = String(formData.get("userPassword") ?? "").trim();
    if (!ROLES.includes(userRole)) return { error: "Perfil de acesso inválido." };

    const linkedUser = await prisma.user.findFirst({ where: { professionalId } });
    if (linkedUser) {
      await prisma.user.update({
        where: { id: linkedUser.id },
        data: { name, role: userRole },
      });
    } else if (userEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
      if (existingUser) return { error: "E-mail já cadastrado." };
      await prisma.user.create({
        data: {
          tenantId: session.tenantId,
          name,
          email: userEmail,
          role: userRole,
          professionalId,
          passwordHash: await hashPassword(userPassword || "demo1234"),
        },
      });
    }
  } catch (err) {
    console.error("upsertProfessional", err);
    return { error: "Não foi possível salvar o profissional. Confira os campos e tente de novo." };
  }

  revalidatePath("/equipe");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function inviteTeamUser(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "RECEPTIONIST") as Role;
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const password = String(formData.get("password") ?? "demo1234");

  if (!name || !email) return { error: "Nome e e-mail são obrigatórios." };
  if (!ROLES.includes(role)) return { error: "Perfil inválido." };
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "E-mail já cadastrado." };

  await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      name,
      email,
      role,
      professionalId,
      passwordHash: await hashPassword(password),
    },
  });
  revalidatePath("/equipe");
  return { ok: true };
}
