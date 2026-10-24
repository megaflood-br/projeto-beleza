import { prisma } from "@/lib/db";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  type SupportCategory,
  type SupportPriority,
  type SupportTicketStatus,
  type Role,
} from "@/lib/constants";
import {
  isPresenceOnline,
  nextTicketNumberFromLast,
  reopenOnSalonReply,
  shouldExpireRinging,
  supportSide,
  ticketUnreadFor,
  type SupportSide,
} from "@/lib/support";
import type { SessionUser } from "@/lib/auth";
import type {
  SupportCallRow,
  SupportLiveState,
  SupportMessageRow,
  SupportTicketRow,
} from "@/components/suporte/types";

function asCategory(value: string): SupportCategory {
  return SUPPORT_CATEGORIES.includes(value as SupportCategory) ? (value as SupportCategory) : "ajuda";
}

function asPriority(value: string): SupportPriority {
  return SUPPORT_PRIORITIES.includes(value as SupportPriority) ? (value as SupportPriority) : "NORMAL";
}

function asStatus(value: string): SupportTicketStatus {
  return SUPPORT_TICKET_STATUSES.includes(value as SupportTicketStatus) ? (value as SupportTicketStatus) : "OPEN";
}

const ticketInclude = {
  tenant: true,
  createdBy: true,
  assignedTo: true,
  messages: { orderBy: { createdAt: "desc" as const }, take: 1, include: { author: true } },
} as const;

function toTicketRow(
  ticket: {
    id: string;
    tenantId: string;
    number: number;
    subject: string;
    category: string;
    priority: string;
    status: string;
    lastMessageAt: Date;
    unreadSalon: number;
    unreadAdmin: number;
    createdAt: Date;
    tenant: { name: string; slug: string };
    createdBy: { name: string };
    assignedTo: { name: string } | null;
    messages: { body: string; kind: string }[];
  },
  side: SupportSide,
): SupportTicketRow {
  const last = ticket.messages[0];
  return {
    id: ticket.id,
    tenantId: ticket.tenantId,
    tenantName: ticket.tenant.name,
    tenantSlug: ticket.tenant.slug,
    number: ticket.number,
    subject: ticket.subject,
    category: asCategory(ticket.category),
    priority: asPriority(ticket.priority),
    status: asStatus(ticket.status),
    createdByName: ticket.createdBy.name,
    assignedToName: ticket.assignedTo?.name ?? null,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    lastPreview: last?.kind === "SYSTEM" ? last.body : last?.body ?? "Sem mensagens",
    unread: ticketUnreadFor(side, ticket),
    createdAt: ticket.createdAt.toISOString(),
  };
}

function toCallRow(call: {
  id: string;
  tenantId: string;
  ticketId: string | null;
  startedById: string;
  acceptedById: string | null;
  status: string;
  startedAt: Date;
  tenant: { name: string };
  startedBy: { name: string; role: string };
  acceptedBy: { name: string } | null;
}): SupportCallRow {
  return {
    id: call.id,
    tenantId: call.tenantId,
    tenantName: call.tenant.name,
    ticketId: call.ticketId,
    startedById: call.startedById,
    startedByName: call.startedBy.name,
    startedBySide: supportSide(call.startedBy.role as Role),
    acceptedByName: call.acceptedBy?.name ?? null,
    status: call.status as SupportCallRow["status"],
    startedAt: call.startedAt.toISOString(),
  };
}

export async function nextTicketNumber(tenantId: string) {
  const last = await prisma.supportTicket.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return nextTicketNumberFromLast(last?.number);
}

export async function touchPresence(session: SessionUser) {
  const side = supportSide(session.role);
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, tenantId: true } });
  if (!user) return;
  await prisma.supportPresence.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      tenantId: user.tenantId,
      side,
      lastSeenAt: new Date(),
    },
    update: { lastSeenAt: new Date(), tenantId: user.tenantId, side },
  });
}

export async function expireStaleCalls() {
  const ringing = await prisma.supportCall.findMany({
    where: { status: "RINGING" },
    include: { ticket: true },
  });
  const stale = ringing.filter((call) => shouldExpireRinging(call.startedAt));
  if (!stale.length) return;
  const now = new Date();
  for (const call of stale) {
    await prisma.supportCall.update({
      where: { id: call.id },
      data: { status: "MISSED", endedAt: now },
    });
    if (!call.ticketId) continue;
    await prisma.supportMessage.create({
      data: {
        ticketId: call.ticketId,
        authorId: call.startedById,
        side: "SYSTEM",
        kind: "SYSTEM",
        body: "Chamada perdida — ninguém atendeu.",
      },
    });
    await prisma.supportTicket.update({
      where: { id: call.ticketId },
      data: { lastMessageAt: now },
    });
  }
}

export async function markTicketRead(ticketId: string, side: SupportSide) {
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: side === "PLATFORM" ? { unreadAdmin: 0 } : { unreadSalon: 0 },
  });
}

export async function appendSupportMessage(input: {
  ticketId: string;
  authorId: string;
  side: SupportSide | "SYSTEM";
  body: string;
  kind?: "TEXT" | "SYSTEM";
}) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) return null;
  const now = new Date();
  const kind = input.kind ?? "TEXT";
  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: input.ticketId,
        authorId: input.authorId,
        side: input.side,
        body: input.body,
        kind,
      },
      include: { author: true },
    }),
    prisma.supportTicket.update({
      where: { id: input.ticketId },
      data: {
        lastMessageAt: now,
        unreadAdmin:
          input.side === "SALON" ? ticket.unreadAdmin + 1 : input.side === "PLATFORM" ? 0 : ticket.unreadAdmin,
        unreadSalon:
          input.side === "PLATFORM" ? ticket.unreadSalon + 1 : input.side === "SALON" ? 0 : ticket.unreadSalon,
        status: input.side === "SALON" && reopenOnSalonReply(ticket.status) ? "OPEN" : ticket.status,
      },
    }),
  ]);
  return message;
}

const callInclude = {
  tenant: true,
  startedBy: true,
  acceptedBy: true,
} as const;

export async function buildSupportLive(session: SessionUser, ticketId?: string | null): Promise<SupportLiveState> {
  const side = supportSide(session.role);
  await touchPresence(session);
  await expireStaleCalls();

  const since = new Date(Date.now() - 45_000);
  const presences = await prisma.supportPresence.findMany({
    where: { lastSeenAt: { gte: since } },
    include: { user: true, tenant: true },
  });
  const online = presences.filter((row) => isPresenceOnline(row.lastSeenAt));

  const adminOnline = online.some((row) => row.side === "PLATFORM");
  const salonGroups = new Map<string, SupportLiveState["onlineSalons"][number]>();
  for (const row of online) {
    if (row.side !== "SALON" || row.tenant.isPlatform) continue;
    const current = salonGroups.get(row.tenantId) ?? {
      tenantId: row.tenantId,
      name: row.tenant.name,
      slug: row.tenant.slug,
      users: [],
    };
    current.users.push({ id: row.userId, name: row.user.name });
    salonGroups.set(row.tenantId, current);
  }

  const callWhere =
    side === "PLATFORM"
      ? { status: { in: ["RINGING", "ACTIVE"] } }
      : { tenantId: session.tenantId, status: { in: ["RINGING", "ACTIVE"] } };

  const calls = await prisma.supportCall.findMany({
    where: callWhere,
    include: callInclude,
    orderBy: { startedAt: "desc" },
  });

  const ticketWhere = side === "PLATFORM" ? {} : { tenantId: session.tenantId };
  const tickets = await prisma.supportTicket.findMany({
    where: ticketWhere,
    include: ticketInclude,
    orderBy: { lastMessageAt: "desc" },
    take: 80,
  });

  const rows = tickets.map((ticket) => toTicketRow(ticket, side));
  const selectedId = ticketId && rows.some((row) => row.id === ticketId) ? ticketId : rows[0]?.id ?? null;

  let selected: SupportLiveState["ticket"] = null;
  if (selectedId) {
    const full = await prisma.supportTicket.findFirst({
      where: { id: selectedId, ...(side === "SALON" ? { tenantId: session.tenantId } : {}) },
      include: {
        ...ticketInclude,
        messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
      },
    });
    if (full) {
      const unread = ticketUnreadFor(side, full);
      if (unread > 0) await markTicketRead(full.id, side);
      selected = {
        ...toTicketRow({ ...full, messages: full.messages.slice().reverse() }, side),
        unread: 0,
        messages: full.messages.map(
          (message): SupportMessageRow => ({
            id: message.id,
            ticketId: message.ticketId,
            authorId: message.authorId,
            authorName: message.author.name,
            side: message.side === "SYSTEM" ? "SYSTEM" : (message.side as SupportSide),
            body: message.body,
            kind: message.kind === "SYSTEM" ? "SYSTEM" : "TEXT",
            createdAt: message.createdAt.toISOString(),
          }),
        ),
      };
    }
  }

  const tenants =
    side === "PLATFORM"
      ? await prisma.tenant.findMany({
          where: { isPlatform: false },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  return {
    side,
    me: { id: session.userId, name: session.name, role: session.role, tenantId: session.tenantId },
    adminOnline,
    onlineSalons: [...salonGroups.values()],
    tenants,
    ringingCalls: calls.filter((call) => call.status === "RINGING").map(toCallRow),
    activeCalls: calls.filter((call) => call.status === "ACTIVE").map(toCallRow),
    tickets: rows.map((row) => (row.id === selectedId ? { ...row, unread: 0 } : row)),
    ticket: selected,
    unread: rows.reduce((sum, row) => sum + (row.id === selectedId ? 0 : row.unread), 0),
  };
}
