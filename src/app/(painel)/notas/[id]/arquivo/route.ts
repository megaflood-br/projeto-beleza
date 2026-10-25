import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { CONTORA_API, contoraArtifactPath, hasContoraArtifacts } from "@/lib/contora";
import { tenantFiscalConfig } from "@/lib/fiscal";
import { digitsOnly } from "@/lib/utils";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, tenant } = await requireTenant();
  const { id } = await params;
  const tipo = new URL(request.url).searchParams.get("tipo") === "xml" ? "xml" : "pdf";
  const invoice = await prisma.fiscalInvoice.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!invoice || !hasContoraArtifacts(invoice)) {
    return NextResponse.json({ error: "Arquivo fiscal indisponível. A nota precisa estar autorizada na Contora." }, { status: 404 });
  }
  const integrations = await resolvePlatformIntegrations();
  const token = integrations.contoraApiToken;
  if (!token) return NextResponse.json({ error: "Token da Contora ausente." }, { status: 409 });

  const path = contoraArtifactPath(invoice.kind, invoice.providerRef as string, tipo);
  const response = await fetch(`${CONTORA_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: tipo === "xml" ? "application/xml, text/xml" : "application/pdf",
      "X-Company-Document": digitsOnly(tenantFiscalConfig(tenant).cnpj),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    return NextResponse.json({ error: `A Contora não devolveu o ${tipo.toUpperCase()}.` }, { status: 502 });
  }

  const ext = tipo === "xml" ? "xml" : "pdf";
  const kindSlug = invoice.kind.toLowerCase();
  return new NextResponse(response.body, {
    headers: {
      "Content-Type":
        response.headers.get("content-type") || (tipo === "xml" ? "application/xml; charset=utf-8" : "application/pdf"),
      "Content-Disposition": `attachment; filename="${kindSlug}-${invoice.number ?? invoice.id}.${ext}"`,
    },
  });
}
