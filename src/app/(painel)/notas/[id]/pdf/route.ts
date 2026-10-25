import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { CONTORA_API, contoraArtifactPath } from "@/lib/contora";
import { tenantFiscalConfig } from "@/lib/fiscal";
import { digitsOnly } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, tenant } = await requireTenant();
  const { id } = await params;
  const invoice = await prisma.fiscalInvoice.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!invoice?.providerRef || invoice.provider !== "contora") {
    return NextResponse.json({ error: "PDF da Contora indisponível." }, { status: 404 });
  }
  const integrations = await resolvePlatformIntegrations();
  const token = integrations.contoraApiToken;
  if (!token) return NextResponse.json({ error: "Token da Contora ausente." }, { status: 409 });
  const path = contoraArtifactPath(invoice.kind, invoice.providerRef);
  const response = await fetch(`${CONTORA_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
      "X-Company-Document": digitsOnly(tenantFiscalConfig(tenant).cnpj),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    return NextResponse.json({ error: "A Contora não devolveu o PDF." }, { status: 502 });
  }
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/pdf",
      "Content-Disposition": `inline; filename="nota-${invoice.number ?? invoice.id}.pdf"`,
    },
  });
}
