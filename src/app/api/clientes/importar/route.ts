import { NextResponse } from "next/server";
import { canManageTeam, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runClientImport } from "@/lib/run-client-import";

export const runtime = "nodejs";
export const maxDuration = 300;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return json({ error: "Faça login para importar." }, 401);
    if (!canManageTeam(session.role)) return json({ error: "Sem permissão para importar." }, 403);
    const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { id: true, status: true } });
    if (!tenant) return json({ error: "Salão não encontrado." }, 401);
    if (tenant.status === "SUSPENDED" && !session.impersonatorId) {
      return json({ error: "Este salão está suspenso." }, 403);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Não foi possível receber o arquivo." }, 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Selecione um arquivo .xls ou .xlsx." });

    const result = await runClientImport(file, session.tenantId);
    return json(result, "error" in result ? 400 : 200);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message.replace(/\s+/g, " ").slice(0, 180) : "";
    console.error("import clients failed", cause);
    return json(
      {
        error: detail.includes("revalidatePath")
          ? "Os clientes foram gravados, mas a lista não atualizou. Abra Clientes e confira o total."
          : "Falha interna ao importar. Abra Clientes e confira o total, depois tente de novo.",
      },
      500,
    );
  }
}
