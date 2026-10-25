"use server";

import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { hasConflict } from "@/lib/appointments";
import { calendarDate } from "@/lib/dates";
import { applyCatalogPrice } from "@/lib/promotions";
import { loadPromoRules } from "@/lib/promo-load";
import { appointmentCampaignVars, safeDispatch } from "@/lib/dispatch-whatsapp-campaign";

export async function publicBook(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const startAt = new Date(String(formData.get("startAt") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "");

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return { error: "Salão não encontrado." };
  if (!name || !phone) return { error: "Informe nome e WhatsApp." };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id, active: true },
  });
  if (!service) return { error: "Serviço indisponível." };

  const endAt = addMinutes(startAt, service.durationMin);
  const busy = await prisma.appointment.findMany({
    where: { professionalId, status: { notIn: ["CANCELLED"] } },
    select: { id: true, startAt: true, endAt: true },
  });
  if (hasConflict({ start: startAt, end: endAt }, busy.map((b) => ({ id: b.id, start: b.startAt, end: b.endAt })))) {
    return { error: "Horário recém ocupado. Escolha outro." };
  }

  const client = await prisma.client.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    update: { name },
    create: { tenantId: tenant.id, name, phone, source: "online" },
  });
  const isNew = Date.now() - client.createdAt.getTime() < 8000;

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      professionalId,
      clientId: client.id,
      startAt,
      endAt,
      status: "PENDING",
      source: "online",
      items: {
        create: {
          serviceId: service.id,
          priceCents: applyCatalogPrice(await loadPromoRules(tenant.id), calendarDate(startAt), "SERVICE", service.id, service.priceCents).priceCents,
          durationMin: service.durationMin,
        },
      },
    },
    include: {
      professional: { select: { name: true } },
      items: { include: { service: { select: { name: true } } } },
    },
  });

  const vars = appointmentCampaignVars(appointment);
  const clientRef = { id: client.id, name: client.name, phone: client.phone };
  if (isNew) safeDispatch({ tenantId: tenant.id, trigger: "WELCOME", client: clientRef, sentOn: client.id });
  safeDispatch({ tenantId: tenant.id, trigger: "INFORMED", client: clientRef, sentOn: appointment.id, vars });
  safeDispatch({ tenantId: tenant.id, trigger: "PIN", client: clientRef, sentOn: appointment.id, vars });

  return { ok: true };
}
