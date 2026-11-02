import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { extractMetaInbound, metaSignatureOk, metaVerifyChallenge } from "@/lib/whatsapp-meta";
import { ingestInboundWhatsApp } from "@/lib/whatsapp-inbound";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const slug = request.nextUrl.searchParams.get("tenant");

  let expected: string | null = null;
  if (slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { metaVerifyToken: true } });
    expected = tenant?.metaVerifyToken ?? null;
  } else if (token) {
    const tenant = await prisma.tenant.findFirst({ where: { metaVerifyToken: token }, select: { metaVerifyToken: true } });
    expected = tenant?.metaVerifyToken ?? null;
  }

  const accepted = metaVerifyChallenge({ mode, token, challenge }, expected);
  if (!accepted) return new NextResponse("forbidden", { status: 403 });
  return new NextResponse(accepted, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const server = await resolvePlatformIntegrations();
  if (!metaSignatureOk(raw, request.headers.get("x-hub-signature-256"), server.metaAppSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const messages = extractMetaInbound(payload);
  if (!messages.length) return NextResponse.json({ ok: true, ignored: true });

  const slug = request.nextUrl.searchParams.get("tenant");
  for (const message of messages) {
    const tenant = slug
      ? await prisma.tenant.findUnique({ where: { slug }, select: { id: true, metaPhoneNumberId: true } })
      : await prisma.tenant.findFirst({
          where: { metaPhoneNumberId: message.phoneNumberId },
          select: { id: true, metaPhoneNumberId: true },
        });
    if (!tenant) continue;
    if (tenant.metaPhoneNumberId && message.phoneNumberId && tenant.metaPhoneNumberId !== message.phoneNumberId) {
      continue;
    }
    await ingestInboundWhatsApp({
      tenantId: tenant.id,
      phone: message.phone,
      body: message.body,
      waId: message.waId,
      channel: "official",
    });
  }

  return NextResponse.json({ ok: true });
}
