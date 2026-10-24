import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildSupportLive } from "@/lib/support-live";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(request.url);
  const ticketId = url.searchParams.get("ticket");
  const state = await buildSupportLive(session, ticketId);
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
