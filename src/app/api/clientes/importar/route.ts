import { NextResponse } from "next/server";
import { canManageTeam, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runClientImport } from "@/lib/run-client-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Faça login para importar." }, { status: 401 });
  if (!canManageTeam(session.role)) {
    return NextResponse.json({ error: "Sem permissão para importar." }, { status: 403 });
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { id: true, status: true } });
  if (!tenant) return NextResponse.json({ error: "Salão não encontrado." }, { status: 401 });
  if (tenant.status === "SUSPENDED" && !session.impersonatorId) {
    return NextResponse.json({ error: "Este salão está suspenso." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Não foi possível receber o arquivo." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo .xls ou .xlsx." });

  const result = await runClientImport(file, session.tenantId);
  return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
}
