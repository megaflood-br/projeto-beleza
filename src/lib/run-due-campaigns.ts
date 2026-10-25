import { prisma } from "@/lib/db";
import { calendarDate, shiftCalendarDate, zonedDateTime } from "@/lib/dates";
import { bookingLink } from "@/lib/whatsapp-campaigns";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { appointmentCampaignVars, dispatchCampaign, moneyVar } from "@/lib/dispatch-whatsapp-campaign";

const LIMIT = 25;

export async function runDueCampaigns(tenantId: string) {
  const today = calendarDate();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, reminderHours: true },
  });
  if (!tenant) return { sent: 0 };
  const server = await resolvePlatformIntegrations();
  const link = bookingLink(server.publicAppUrl, tenant.slug);
  let sent = 0;

  const birthClients = await prisma.client.findMany({
    where: { tenantId, active: true, birthDate: { not: null }, phone: { not: "" } },
    select: { id: true, name: true, phone: true, birthDate: true },
  });
  for (const client of birthClients) {
    if (!client.birthDate) continue;
    const stamp = calendarDate(client.birthDate);
    if (stamp.slice(5) !== today.slice(5)) continue;
    const result = await dispatchCampaign({
      tenantId,
      trigger: "BIRTHDAY",
      client,
      sentOn: today,
    }).catch(() => null);
    if (result && "ok" in result) sent += 1;
    if (sent >= LIMIT) return { sent };
  }

  const start = zonedDateTime(today, "00:00");
  const end = zonedDateTime(shiftCalendarDate(today, 1), "00:00");
  const todayAppointments = await prisma.appointment.findMany({
    where: { tenantId, startAt: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    include: { client: { select: { id: true, name: true, phone: true } }, professional: { select: { name: true } }, items: { include: { service: { select: { name: true } } } } },
  });
  for (const appointment of todayAppointments) {
    if (!appointment.client) continue;
    const result = await dispatchCampaign({
      tenantId,
      trigger: "REMINDER",
      client: appointment.client,
      sentOn: appointment.id,
      vars: appointmentCampaignVars(appointment),
    }).catch(() => null);
    if (result && "ok" in result) sent += 1;
  }

  const yesterday = shiftCalendarDate(today, -1);
  const yStart = zonedDateTime(yesterday, "00:00");
  const yEnd = zonedDateTime(today, "00:00");
  const done = await prisma.appointment.findMany({
    where: { tenantId, startAt: { gte: yStart, lt: yEnd }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    include: { client: { select: { id: true, name: true, phone: true } }, professional: { select: { name: true } }, items: { include: { service: { select: { name: true } } } } },
    take: LIMIT,
  });
  for (const appointment of done) {
    if (!appointment.client) continue;
    const vars = appointmentCampaignVars(appointment);
    const nurture = await dispatchCampaign({
      tenantId,
      trigger: "NURTURE",
      client: appointment.client,
      sentOn: appointment.id,
      vars,
    }).catch(() => null);
    if (nurture && "ok" in nurture) sent += 1;
  }

  const cutoff30 = zonedDateTime(shiftCalendarDate(today, -30), "00:00");
  const cutoff21 = zonedDateTime(shiftCalendarDate(today, -21), "00:00");
  const inactive = await prisma.client.findMany({
    where: {
      tenantId,
      active: true,
      phone: { not: "" },
      appointments: { none: { startAt: { gte: cutoff30 }, status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
    },
    select: { id: true, name: true, phone: true },
    take: LIMIT,
  });
  for (const client of inactive) {
    const result = await dispatchCampaign({ tenantId, trigger: "WINBACK", client, sentOn: today, vars: { link } }).catch(() => null);
    if (result && "ok" in result) sent += 1;
  }

  const returners = await prisma.client.findMany({
    where: {
      tenantId,
      active: true,
      phone: { not: "" },
      appointments: {
        some: { startAt: { gte: cutoff30, lt: cutoff21 }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
        none: { startAt: { gte: cutoff21 }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      },
    },
    select: { id: true, name: true, phone: true },
    take: LIMIT,
  });
  for (const client of returners) {
    const result = await dispatchCampaign({ tenantId, trigger: "RETURN", client, sentOn: today }).catch(() => null);
    if (result && "ok" in result) sent += 1;
  }

  const packs = await prisma.clientPackage.findMany({
    where: { tenantId, remaining: { lte: 1 } },
    include: { client: { select: { id: true, name: true, phone: true } }, package: { select: { name: true } } },
    take: LIMIT,
  });
  for (const row of packs) {
    const result = await dispatchCampaign({
      tenantId,
      trigger: "PACKAGE_EXPIRING",
      client: row.client,
      sentOn: today,
      vars: { servico: row.package.name },
    }).catch(() => null);
    if (result && "ok" in result) sent += 1;
  }

  const open = await prisma.comanda.findMany({
    where: { tenantId, status: "OPEN", createdAt: { lte: zonedDateTime(shiftCalendarDate(today, -2), "00:00") } },
    include: { client: { select: { id: true, name: true, phone: true } }, items: true },
    take: LIMIT,
  });
  for (const comanda of open) {
    if (!comanda.client) continue;
    const total = comanda.items.reduce((sum, item) => sum + Math.round(item.quantity * item.priceCents) - item.discountCents, 0);
    const result = await dispatchCampaign({
      tenantId,
      trigger: "CHARGE",
      client: comanda.client,
      sentOn: comanda.id,
      vars: { valor: moneyVar(Math.max(0, total - comanda.discountCents)) },
    }).catch(() => null);
    if (result && "ok" in result) sent += 1;
  }

  return { sent };
}
