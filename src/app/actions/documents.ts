"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { zonedDateTime } from "@/lib/dates";
import { documentationPath, isArchiveTab, kindForTab, parseDocumentationTab, parseDocumentKind } from "@/lib/documentation";
import { removeSalonDocumentFile, saveSalonDocumentFile } from "@/lib/document-upload";

function refreshDocs() {
  try {
    revalidatePath("/documentacao");
  } catch {
    /* ignore */
  }
}

function parseDay(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return zonedDateTime(value, "12:00");
}

export async function saveSalonDocument(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para arquivar documentos." };
  if (typeof prisma.salonDocument?.create !== "function") {
    return { error: "Reinicie o painel para habilitar o arquivo de documentos." };
  }

  const tab = parseDocumentationTab(String(formData.get("tab") ?? ""));
  if (!isArchiveTab(tab)) return { error: "Aba inválida." };
  const kind = parseDocumentKind(String(formData.get("kind") ?? "")) ?? kindForTab(tab);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Informe o título do documento." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo PDF ou imagem." };
  const uploaded = await saveSalonDocumentFile(session.tenantId, file);
  if ("error" in uploaded) return { error: uploaded.error };

  const professionalId = String(formData.get("professionalId") ?? "").trim() || null;
  if (professionalId) {
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!professional) {
      await removeSalonDocumentFile(uploaded.url);
      return { error: "Prestador não encontrado." };
    }
  }

  await prisma.salonDocument.create({
    data: {
      tenantId: session.tenantId,
      professionalId,
      kind,
      title,
      number: String(formData.get("number") ?? "").trim(),
      issuer: String(formData.get("issuer") ?? "").trim(),
      issuedAt: parseDay(formData.get("issuedAt")),
      expiresAt: parseDay(formData.get("expiresAt")),
      fileUrl: uploaded.url,
      fileName: uploaded.fileName || title,
      notes: String(formData.get("notes") ?? "").trim(),
    },
  });
  refreshDocs();
  return { ok: true as const, path: documentationPath(tab) };
}

export async function deleteSalonDocument(formData: FormData) {
  const { session } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para excluir documentos." };
  if (typeof prisma.salonDocument?.findFirst !== "function") {
    return { error: "Reinicie o painel para habilitar o arquivo de documentos." };
  }
  const id = String(formData.get("id") ?? "");
  const row = await prisma.salonDocument.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "Documento não encontrado." };
  await prisma.salonDocument.delete({ where: { id } });
  await removeSalonDocumentFile(row.fileUrl);
  refreshDocs();
  return { ok: true as const };
}
