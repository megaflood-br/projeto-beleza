import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readWhatsAppLive } from "@/lib/whatsapp-live";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (isPlatformAdmin(session.role) && !session.impersonatorId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });
  const live = await readWhatsAppLive(tenant.id);
  return NextResponse.json(live, { headers: { "Cache-Control": "no-store" } });
}
