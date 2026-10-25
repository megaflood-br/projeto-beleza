"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { digitsOnly } from "@/lib/utils";
import { isFiscalKind, isValidCnpj, tenantFiscalConfig } from "@/lib/fiscal";
import { cancelFiscalInvoice, issueComandaInvoices } from "@/lib/fiscal-issue";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { ensureContoraCompany, uploadContoraCertificate } from "@/lib/contora";

function revalidateFiscal() {
  revalidatePath("/notas");
  revalidatePath("/comandas");
  revalidatePath("/configuracoes");
}

export async function saveFiscalSettings(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };

  const cnpj = digitsOnly(String(formData.get("fiscalCnpj") ?? ""));
  if (cnpj && !isValidCnpj(cnpj)) return { error: "CNPJ inválido." };

  const iss = Number(String(formData.get("fiscalIssPct") ?? "5").replace(",", "."));
  const nextNumber = Number(String(formData.get("fiscalNextNumber") ?? "1"));
  const providerRaw = String(formData.get("fiscalProvider") ?? "contora");
  const provider = providerRaw === "local" ? "local" : "contora";

  await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      fiscalEnabled: String(formData.get("fiscalEnabled") ?? "") === "1",
      fiscalCnpj: cnpj || null,
      document: cnpj || undefined,
      fiscalIe: String(formData.get("fiscalIe") ?? "").trim() || null,
      fiscalIm: String(formData.get("fiscalIm") ?? "").trim() || null,
      fiscalCrt: String(formData.get("fiscalCrt") ?? "1") || "1",
      fiscalUf: String(formData.get("fiscalUf") ?? "SP").trim().toUpperCase() || "SP",
      fiscalIbge: String(formData.get("fiscalIbge") ?? "").trim() || null,
      fiscalIssPct: Number.isFinite(iss) ? Math.min(100, Math.max(0, Math.round(iss))) : 5,
      fiscalServiceCode: String(formData.get("fiscalServiceCode") ?? "6.01").trim() || "6.01",
      fiscalSeries: String(formData.get("fiscalSeries") ?? "1").trim() || "1",
      fiscalNextNumber: Number.isFinite(nextNumber) && nextNumber > 0 ? Math.round(nextNumber) : 1,
      fiscalProvider: provider,
      fiscalEnvironment: String(formData.get("fiscalEnvironment") ?? "homolog") === "prod" ? "prod" : "homolog",
      fiscalAutoIssue: String(formData.get("fiscalAutoIssue") ?? "") === "1",
      fiscalStreet: String(formData.get("fiscalStreet") ?? "").trim() || null,
      fiscalNumber: String(formData.get("fiscalNumber") ?? "").trim() || null,
      fiscalDistrict: String(formData.get("fiscalDistrict") ?? "").trim() || null,
      fiscalZip: digitsOnly(String(formData.get("fiscalZip") ?? "")) || null,
      fiscalCscId: String(formData.get("fiscalCscId") ?? "").trim() || null,
      fiscalCscToken: (() => {
        const token = String(formData.get("fiscalCscToken") ?? "").trim();
        if (!token || token.includes("••••")) return undefined;
        return token;
      })(),
    },
  });

  const updated = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
  if (!updated) return { error: "Salão não encontrado." };
  const config = tenantFiscalConfig(updated);
  const integrations = await resolvePlatformIntegrations();
  const token = integrations.contoraApiToken || "";

  if (provider === "contora" && config.enabled && isValidCnpj(config.cnpj)) {
    if (!token) {
      revalidateFiscal();
      return { ok: true as const, warning: "Salvo. Falta o token da Contora em Plataforma → Integrações." };
    }
    try {
      const companyId = await ensureContoraCompany(token, config);
      const cert = formData.get("certificate");
      const password = String(formData.get("certificatePassword") ?? "");
      let certificateUntil: Date | undefined;
      if (cert instanceof File && cert.size > 0) {
        if (cert.size > 2_000_000) return { error: "Certificado maior que 2 MB." };
        if (!password) return { error: "Informe a senha do certificado A1." };
        const uploaded = await uploadContoraCertificate(token, companyId, cert, password);
        const until = uploaded.valid_until || uploaded.validUntil;
        certificateUntil = until ? new Date(until) : new Date();
      }
      await prisma.tenant.update({
        where: { id: session.tenantId },
        data: {
          fiscalContoraCompanyId: companyId,
          ...(certificateUntil
            ? { fiscalCertificateAt: new Date(), fiscalCertificateUntil: certificateUntil }
            : {}),
        },
      });
    } catch (error) {
      revalidateFiscal();
      return { error: error instanceof Error ? error.message : "Não foi possível sincronizar a empresa na Contora." };
    }
  }

  revalidateFiscal();
  return { ok: true as const };
}

export async function emitComandaInvoice(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };
  const comandaId = String(formData.get("comandaId") ?? "");
  const rawKind = String(formData.get("kind") ?? "");
  const kinds = rawKind && isFiscalKind(rawKind) ? [rawKind] : undefined;
  const result = await issueComandaInvoices(session.tenantId, comandaId, kinds);
  revalidateFiscal();
  if (result && "ok" in result) revalidatePath(`/comandas/${comandaId}`);
  return result;
}

export async function cancelInvoiceAction(formData: FormData) {
  const { session } = await requireTenant();
  if (!canSeeFinance(session.role)) return { error: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const result = await cancelFiscalInvoice(session.tenantId, id);
  revalidateFiscal();
  return result;
}
