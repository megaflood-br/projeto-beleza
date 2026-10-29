"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/auth";
import { popByKey } from "@/lib/pops";

function refreshPops(tenantSlug: string, popSlug: string) {
  try {
    revalidatePath("/pops");
    revalidatePath(`/pop/${tenantSlug}/${popSlug}`);
  } catch {
    /* ignore */
  }
}

export async function saveSalonPop(formData: FormData) {
  const { session, tenant } = await requireTenant();
  if (!canManageTeam(session.role)) return { error: "Sem permissão para alterar POPs." };
  const id = String(formData.get("id") ?? "");
  const row = await prisma.salonPop.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!row) return { error: "POP não encontrado." };
  const template = popByKey(row.templateKey);
  const responsible = String(formData.get("responsible") ?? "").trim();
  const registry = String(formData.get("registry") ?? "").trim();
  const products = String(formData.get("products") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const active = formData.get("active") === "1";
  await prisma.salonPop.update({
    where: { id },
    data: {
      responsible,
      registry: template?.signer === "TECHNICAL" ? registry : "",
      products: products || template?.defaultProducts || row.products,
      frequency: frequency || template?.defaultFrequency || row.frequency,
      notes,
      active,
      revision: row.revision + 1,
    },
  });
  refreshPops(tenant.slug, row.slug);
  return { ok: true as const };
}
