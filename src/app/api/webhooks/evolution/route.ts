import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyEvolutionWebhook } from "@/lib/evolution-webhook";

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenant");
  if (!slug) return NextResponse.json({ error: "tenant query missing" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const payload = (await request.json()) as Record<string, unknown>;
  const result = await applyEvolutionWebhook(tenant.id, payload);
  return NextResponse.json(result);
}
