"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";
import { slugify } from "@/lib/utils";
import type { Role } from "@/lib/constants";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "E-mail ou senha inválidos." };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "E-mail ou senha inválidos." };

  await setSessionCookie({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  });
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const salon = String(formData.get("salon") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !salon || !email || password.length < 6) {
    return { error: "Preencha todos os campos. A senha precisa ter 6+ caracteres." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Já existe uma conta com este e-mail." };

  let slug = slugify(salon);
  const slugTaken = await prisma.tenant.findUnique({ where: { slug } });
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const tenant = await prisma.tenant.create({
    data: {
      name: salon,
      slug,
      email,
      users: {
        create: {
          email,
          name,
          passwordHash: await hashPassword(password),
          role: "OWNER",
        },
      },
      categories: {
        create: [{ name: "Cabelo" }, { name: "Estética" }, { name: "Unhas" }, { name: "Barba" }],
      },
      automations: {
        create: [
          {
            name: "Confirmação de agendamento",
            trigger: "APPOINTMENT_CREATED",
            template:
              "Oi {{nome}}! Seu horário no {{salao}} está marcado para {{data}} às {{hora}}. Responda SIM para confirmar.",
          },
        ],
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  await setSessionCookie({
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
    name: user.name,
    role: "OWNER",
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function sessionPayload(user: SessionUser) {
  return user;
}
