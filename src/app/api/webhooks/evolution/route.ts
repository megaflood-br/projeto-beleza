import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractEvolutionNumber, extractInboundText, extractPhone, isEvolutionFromMe, parseEvolutionState } from "@/lib/evolution";
import { ingestInboundWhatsApp } from "@/lib/whatsapp-inbound";

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant");
  if (!slug) return NextResponse.json({ error: "tenant query missing" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const payload = (await request.json()) as Record<string, unknown>;
  const event = String(payload.event ?? payload.type ?? "").toLowerCase();
  if (event.includes("connection")) {
    const state = parseEvolutionState(payload.data ?? payload);
    const number = extractEvolutionNumber(payload.data ?? payload);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { evolutionStatus: state, ...(number ? { evolutionNumber: number } : {}) },
    });
    return NextResponse.json({ ok: true, event: "connection" });
  }

  const phone = extractPhone(payload);
  const body = extractInboundText(payload);
  if (isEvolutionFromMe(payload) || !phone || !body) return NextResponse.json({ ok: true, ignored: true });

  await ingestInboundWhatsApp({
    tenantId: tenant.id,
    phone,
    body,
    channel: "evolution",
  });

  return NextResponse.json({ ok: true });
}
