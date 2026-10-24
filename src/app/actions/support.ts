"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/auth";
import { requirePlatformAdmin, requireSession } from "@/lib/tenant";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
} from "@/lib/constants";
import { appendSupportMessage, nextTicketNumber } from "@/lib/support-live";
import { supportSide } from "@/lib/support";

function revalidateSupport() {
  revalidatePath("/suporte");
  revalidatePath("/plataforma/suporte");
  revalidatePath("/plataforma");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function loadTicketForSession(ticketId: string) {
  const session = await requireSession();
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { tenant: true },
  });
  if (!ticket) return { error: "Ticket não encontrado." } as const;
  if (!isPlatformAdmin(session.role) && ticket.tenantId !== session.tenantId) {
    return { error: "Ticket não encontrado." } as const;
  }
  return { session, ticket };
}

export async function createSupportTicket(formData: FormData) {
  const session = await requireSession();
  const subject = text(formData, "subject");
  const body = text(formData, "body");
  const category = text(formData, "category") || "ajuda";
  const priority = text(formData, "priority") || "NORMAL";
  const tenantId = isPlatformAdmin(session.role) ? text(formData, "tenantId") : session.tenantId;

  if (!subject || !body) return { error: "Informe o assunto e a mensagem." };
  if (!SUPPORT_CATEGORIES.includes(category as (typeof SUPPORT_CATEGORIES)[number])) {
    return { error: "Categoria inválida." };
  }
  if (!SUPPORT_PRIORITIES.includes(priority as (typeof SUPPORT_PRIORITIES)[number])) {
    return { error: "Prioridade inválida." };
  }
  if (!tenantId) return { error: "Selecione o salão." };

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isPlatform: false } });
  if (!tenant) return { error: "Salão não encontrado." };

  const number = await nextTicketNumber(tenant.id);
  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId: tenant.id,
      number,
      subject,
      category,
      priority,
      status: "OPEN",
      createdById: session.userId,
      assignedToId: isPlatformAdmin(session.role) ? session.userId : null,
      lastMessageAt: new Date(),
      unreadAdmin: isPlatformAdmin(session.role) ? 0 : 1,
      unreadSalon: isPlatformAdmin(session.role) ? 1 : 0,
    },
  });
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: session.userId,
      side: supportSide(session.role),
      body,
    },
  });
  revalidateSupport();
  return { ok: true as const, id: ticket.id };
}

export async function sendSupportMessage(formData: FormData) {
  const ticketId = text(formData, "ticketId");
  const body = text(formData, "body");
  if (!ticketId || !body) return { error: "Escreva uma mensagem." };
  const loaded = await loadTicketForSession(ticketId);
  if ("error" in loaded) return loaded;
  await appendSupportMessage({
    ticketId,
    authorId: loaded.session.userId,
    side: supportSide(loaded.session.role),
    body,
  });
  revalidateSupport();
  return { ok: true as const };
}

export async function updateSupportTicket(formData: FormData) {
  await requirePlatformAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const priority = text(formData, "priority");
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return { error: "Ticket não encontrado." };
  if (status && !SUPPORT_TICKET_STATUSES.includes(status as (typeof SUPPORT_TICKET_STATUSES)[number])) {
    return { error: "Status inválido." };
  }
  if (priority && !SUPPORT_PRIORITIES.includes(priority as (typeof SUPPORT_PRIORITIES)[number])) {
    return { error: "Prioridade inválida." };
  }
  await prisma.supportTicket.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
  });
  if (status === "RESOLVED" || status === "CLOSED") {
    const session = await requireSession();
    await appendSupportMessage({
      ticketId: id,
      authorId: session.userId,
      side: "SYSTEM",
      kind: "SYSTEM",
      body: status === "RESOLVED" ? "Ticket marcado como resolvido." : "Ticket fechado.",
    });
  }
  revalidateSupport();
  return { ok: true as const };
}

async function ensureLiveTicket(params: {
  tenantId: string;
  authorId: string;
  subject: string;
  body: string;
  side: "PLATFORM" | "SALON";
}) {
  const existing = await prisma.supportTicket.findFirst({
    where: { tenantId: params.tenantId, status: { in: ["OPEN", "PENDING"] }, subject: params.subject },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) {
    await appendSupportMessage({
      ticketId: existing.id,
      authorId: params.authorId,
      side: "SYSTEM",
      kind: "SYSTEM",
      body: params.body,
    });
    return existing;
  }
  const number = await nextTicketNumber(params.tenantId);
  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId: params.tenantId,
      number,
      subject: params.subject,
      category: "ajuda",
      priority: "HIGH",
      status: "OPEN",
      createdById: params.authorId,
      assignedToId: params.side === "PLATFORM" ? params.authorId : null,
      lastMessageAt: new Date(),
      unreadAdmin: params.side === "SALON" ? 1 : 0,
      unreadSalon: params.side === "PLATFORM" ? 1 : 0,
    },
  });
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: params.authorId,
      side: "SYSTEM",
      kind: "SYSTEM",
      body: params.body,
    },
  });
  return ticket;
}

export async function startSupportCall(formData: FormData) {
  const session = await requireSession();
  const side = supportSide(session.role);
  const tenantId = side === "PLATFORM" ? text(formData, "tenantId") : session.tenantId;
  if (!tenantId) return { error: "Selecione o salão." };

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, isPlatform: false } });
  if (!tenant) return { error: "Salão não encontrado." };

  const busy = await prisma.supportCall.findFirst({
    where: { tenantId: tenant.id, status: { in: ["RINGING", "ACTIVE"] } },
  });
  if (busy) return { error: "Já existe uma chamada em andamento com este salão." };

  const requestedTicketId = text(formData, "ticketId");
  const existingTicket = requestedTicketId
    ? await prisma.supportTicket.findFirst({ where: { id: requestedTicketId, tenantId: tenant.id } })
    : null;
  const ticket = existingTicket
    ? existingTicket
    : await ensureLiveTicket({
          tenantId: tenant.id,
          authorId: session.userId,
          subject: "Atendimento ao vivo",
          body:
            side === "PLATFORM"
              ? `${session.name} está chamando o salão.`
              : `${session.name} está chamando o suporte MegaBeauty.`,
          side,
        });

  if (!ticket) return { error: "Não foi possível abrir o atendimento." };

  const call = await prisma.supportCall.create({
    data: {
      tenantId: tenant.id,
      ticketId: ticket.id,
      startedById: session.userId,
      status: "RINGING",
    },
  });
  revalidateSupport();
  return { ok: true as const, id: call.id, ticketId: ticket.id };
}

export async function acceptSupportCall(formData: FormData) {
  const session = await requireSession();
  const id = text(formData, "id");
  const call = await prisma.supportCall.findUnique({ where: { id }, include: { tenant: true } });
  if (!call || call.status !== "RINGING") return { error: "Chamada indisponível." };
  if (!isPlatformAdmin(session.role) && call.tenantId !== session.tenantId) {
    return { error: "Chamada indisponível." };
  }
  if (call.startedById === session.userId) return { error: "Aguarde a outra ponta atender." };

  await prisma.supportCall.update({
    where: { id },
    data: { status: "ACTIVE", acceptedById: session.userId, answeredAt: new Date() },
  });
  if (call.ticketId) {
    await appendSupportMessage({
      ticketId: call.ticketId,
      authorId: session.userId,
      side: "SYSTEM",
      kind: "SYSTEM",
      body: `${session.name} atendeu a chamada.`,
    });
    if (isPlatformAdmin(session.role)) {
      await prisma.supportTicket.update({
        where: { id: call.ticketId },
        data: { assignedToId: session.userId, status: "OPEN" },
      });
    }
  }
  revalidateSupport();
  return { ok: true as const, ticketId: call.ticketId };
}

export async function declineSupportCall(formData: FormData) {
  const session = await requireSession();
  const id = text(formData, "id");
  const call = await prisma.supportCall.findUnique({ where: { id } });
  if (!call || call.status !== "RINGING") return { error: "Chamada indisponível." };
  if (!isPlatformAdmin(session.role) && call.tenantId !== session.tenantId) {
    return { error: "Chamada indisponível." };
  }
  await prisma.supportCall.update({
    where: { id },
    data: { status: "DECLINED", endedAt: new Date() },
  });
  if (call.ticketId) {
    await appendSupportMessage({
      ticketId: call.ticketId,
      authorId: session.userId,
      side: "SYSTEM",
      kind: "SYSTEM",
      body: `${session.name} recusou a chamada.`,
    });
  }
  revalidateSupport();
  return { ok: true as const };
}

export async function endSupportCall(formData: FormData) {
  const session = await requireSession();
  const id = text(formData, "id");
  const call = await prisma.supportCall.findUnique({ where: { id } });
  if (!call || (call.status !== "ACTIVE" && call.status !== "RINGING")) {
    return { error: "Chamada indisponível." };
  }
  if (!isPlatformAdmin(session.role) && call.tenantId !== session.tenantId) {
    return { error: "Chamada indisponível." };
  }
  await prisma.supportCall.update({
    where: { id },
    data: { status: call.status === "RINGING" ? "ENDED" : "ENDED", endedAt: new Date() },
  });
  if (call.ticketId) {
    await appendSupportMessage({
      ticketId: call.ticketId,
      authorId: session.userId,
      side: "SYSTEM",
      kind: "SYSTEM",
      body: `${session.name} encerrou a chamada.`,
    });
  }
  revalidateSupport();
  return { ok: true as const };
}

