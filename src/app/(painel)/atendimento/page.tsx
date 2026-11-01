import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { readWhatsAppLive } from "@/lib/whatsapp-live";
import { InboxBoard } from "@/components/whatsapp/inbox-board";
import type { InboxClientProfile } from "@/components/whatsapp/inbox-client-panel";
import { comandaTotal } from "@/lib/comandas";
import { settingsPath } from "@/lib/settings";
import { whatsappPhoneCandidates } from "@/lib/whatsapp-campaigns";

export default async function AtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { session } = await requireTenant();
  const params = await searchParams;
  const selectedId = typeof params.c === "string" ? params.c : null;
  const [live, conversations] = await Promise.all([
    readWhatsAppLive(session.tenantId),
    prisma.conversation.findMany({
      where: { tenantId: session.tenantId },
      include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
  ]);
  const selected = conversations.find((row) => row.id === selectedId) ?? conversations[0] ?? null;
  const profile = selected ? await loadInboxProfile(session.tenantId, selected) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Atendimento</h1>
        <p className="text-ink-soft">
          Conversas do WhatsApp do salão.
          {live.state !== "open" ? (
            <>
              {" "}
              <Link href={settingsPath("whatsapp")} className="font-medium text-wine">
                Conectar em Configurações
              </Link>
            </>
          ) : null}
        </p>
      </div>
      <InboxBoard
        selectedId={selected?.id ?? null}
        profile={profile}
        conversations={conversations.map((conversation) => ({
          id: conversation.id,
          phone: conversation.phone,
          client: conversation.client ? { name: conversation.client.name } : profile?.client && conversation.id === selected?.id
            ? { name: profile.client.name }
            : null,
          messages: conversation.messages,
        }))}
      />
    </div>
  );
}

async function loadInboxProfile(
  tenantId: string,
  conversation: { id: string; phone: string; clientId: string | null; client: { id: string } | null },
): Promise<InboxClientProfile> {
  const candidates = whatsappPhoneCandidates(conversation.phone);
  let client =
    conversation.clientId
      ? await prisma.client.findFirst({ where: { id: conversation.clientId, tenantId } })
      : null;
  if (!client && candidates.length) {
    client = await prisma.client.findFirst({
      where: { tenantId, phone: { in: candidates } },
    });
    if (client && conversation.clientId !== client.id) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { clientId: client.id },
      });
    }
  }

  if (!client) {
    return { conversationId: conversation.id, phone: conversation.phone, client: null, appointments: [], sales: [] };
  }

  const [appointments, comandas] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, clientId: client.id },
      include: { items: { include: { service: true } } },
      orderBy: { startAt: "desc" },
      take: 3,
    }),
    prisma.comanda.findMany({
      where: { tenantId, clientId: client.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return {
    conversationId: conversation.id,
    phone: conversation.phone,
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      instagram: client.instagram,
      tags: client.tags,
      notes: client.notes,
      imageUrl: client.imageUrl,
      creditCents: client.creditCents,
      cashbackCents: client.cashbackCents,
    },
    appointments: appointments.map((row) => ({
      id: row.id,
      startAt: row.startAt,
      status: row.status,
      service: row.items.map((item) => item.service.name).filter(Boolean).join(", ") || "Horário",
    })),
    sales: comandas.map((row) => ({
      id: row.id,
      number: row.number,
      createdAt: row.createdAt,
      status: row.status,
      totalCents: comandaTotal(row),
    })),
  };
}
