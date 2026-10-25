import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(`/notas/${id}/arquivo?tipo=pdf`, url.origin));
}
