import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractInboundText, extractPhone } from "@/lib/evolution";

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant");
  if (!slug) return NextResponse.json({ error: "tenant query missing" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const payload = (await request.json()) as Record<string, unknown>;
  const phone = extractPhone(payload);
  const body = extractInboundText(payload);
  if (!phone || !body) return NextResponse.json({ ok: true, ignored: true });

  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone },
  });

  const conversation = await prisma.conversation.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    update: { lastMessageAt: new Date(), unread: { increment: 1 }, clientId: client?.id },
    create: { tenantId: tenant.id, phone, clientId: client?.id, lastMessageAt: new Date(), unread: 1 },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "IN",
      body,
    },
  });

  return NextResponse.json({ ok: true });
}
