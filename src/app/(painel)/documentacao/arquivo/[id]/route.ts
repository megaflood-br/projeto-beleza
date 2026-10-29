import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { documentMime, readSalonDocumentFile } from "@/lib/document-upload";
import { downloadFileName } from "@/lib/documentation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session } = await requireTenant();
  const { id } = await params;
  if (typeof prisma.salonDocument?.findFirst !== "function") {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }
  const row = await prisma.salonDocument.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { fileUrl: true, fileName: true, title: true },
  });
  if (!row) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  const data = await readSalonDocumentFile(row.fileUrl);
  if (!data) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  const filename = downloadFileName(row.fileName || row.title);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": documentMime(row.fileUrl),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
