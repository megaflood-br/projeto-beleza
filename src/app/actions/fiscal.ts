"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canSeeFinance } from "@/lib/auth";
import { digitsOnly } from "@/lib/utils";
import { isFiscalKind, isValidCnpj } from "@/lib/fiscal";
import { cancelFiscalInvoice, issueComandaInvoices } from "@/lib/fiscal-issue";

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
      fiscalProvider: String(formData.get("fiscalProvider") ?? "local") === "focusnfe" ? "focusnfe" : "local",
      fiscalProviderUrl: String(formData.get("fiscalProviderUrl") ?? "").trim() || null,
      fiscalProviderToken: (() => {
        const token = String(formData.get("fiscalProviderToken") ?? "").trim();
        if (!token || token.includes("••••")) return undefined;
        return token;
      })(),
      fiscalEnvironment: String(formData.get("fiscalEnvironment") ?? "homolog") === "prod" ? "prod" : "homolog",
      fiscalAutoIssue: String(formData.get("fiscalAutoIssue") ?? "") === "1",
    },
  });
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
