"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { zonedDateTime } from "@/lib/dates";
import { slugify } from "@/lib/utils";
import {
  anamnesisInviteMessage,
  anamnesisInviteUrl,
  collectAlerts,
  createAnamnesisInviteToken,
  ensureAnamnesisForms,
  isAnamnesisArea,
  missingRequired,
  parseAnswers,
  parseQuestions,
  sanitizeAnamnesisToken,
  serializeAnswers,
  serializeQuestions,
  type AnamnesisAnswer,
  type AnamnesisQuestion,
} from "@/lib/anamnesis";
import { resolvePlatformIntegrations } from "@/lib/integrations";
import { toEvolutionNumber } from "@/lib/whatsapp-campaigns";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function revalidateClient(clientId: string) {
  revalidatePath("/anamneses");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}

export async function saveAnamnesisForm(formData: FormData) {
  const { session } = await requireTenant();
  await ensureAnamnesisForms(session.tenantId);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const area = String(formData.get("area") ?? "geral");
  const description = String(formData.get("description") ?? "").trim();
  const active = String(formData.get("active") ?? "1") !== "0";
  if (!name) return { error: "Informe o nome da ficha." };
  if (!isAnamnesisArea(area)) return { error: "Área inválida." };

  const questions = parseFormQuestions(formData);
  if (!questions.length) return { error: "Inclua pelo menos uma pergunta." };

  let slug = slugify(String(formData.get("slug") ?? "") || name) || "ficha";
  const taken = await prisma.anamnesisForm.findFirst({
    where: { tenantId: session.tenantId, slug, ...(id ? { NOT: { id } } : {}) },
  });
  if (taken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  if (id) {
    const existing = await prisma.anamnesisForm.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Ficha não encontrada." };
    await prisma.anamnesisForm.update({
      where: { id },
      data: { name, area, description, active, questions: serializeQuestions(questions) },
    });
  } else {
    const last = await prisma.anamnesisForm.findFirst({
      where: { tenantId: session.tenantId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await prisma.anamnesisForm.create({
      data: {
        tenantId: session.tenantId,
        name,
        slug,
        area,
        description,
        active,
        questions: serializeQuestions(questions),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }
  revalidatePath("/anamneses");
  revalidatePath("/clientes");
  return { ok: true };
}

function parseFormQuestions(formData: FormData): AnamnesisQuestion[] {
  const raw = String(formData.get("questions") ?? "");
  if (raw) return parseQuestions(raw);
  return [];
}

export async function deleteAnamnesisForm(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.anamnesisForm.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { _count: { select: { records: true } } },
  });
  if (!existing) return { error: "Ficha não encontrada." };
  if (existing._count.records > 0) {
    return { error: "Não é possível excluir uma ficha que já tem anamneses preenchidas." };
  }
  await prisma.anamnesisForm.delete({ where: { id } });
  revalidatePath("/anamneses");
  return { ok: true };
}

export async function saveAnamnesis(formData: FormData) {
  const { session } = await requireTenant();
  await ensureAnamnesisForms(session.tenantId);
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const formId = String(formData.get("formId") ?? "");
  const professionalId = String(formData.get("professionalId") ?? "") || null;
  const notes = text(formData, "notes");
  const signedName = text(formData, "signedName");
  const complete = String(formData.get("complete") ?? "") === "1";
  const dateRaw = String(formData.get("occurredAt") ?? "");
  const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? zonedDateTime(dateRaw, "12:00") : new Date();

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: session.tenantId } });
  if (!client) return { error: "Selecione um cliente." };
  const form = await prisma.anamnesisForm.findFirst({ where: { id: formId, tenantId: session.tenantId } });
  if (!form) return { error: "Selecione uma ficha de anamnese." };
  if (professionalId) {
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, tenantId: session.tenantId },
    });
    if (!professional) return { error: "Profissional não encontrado." };
  }

  const questions = parseQuestions(form.questions);
  const answers = parsePostedAnswers(formData, questions);
  const missing = complete ? missingRequired(questions, answers) : [];
  if (missing.length) {
    return { error: `Preencha as perguntas obrigatórias: ${missing.join(", ")}.` };
  }
  if (complete && !signedName) {
    return { error: "Informe o nome de quem assinou para concluir a ficha." };
  }

  const payload = {
    clientId,
    formId,
    professionalId,
    notes,
    answers: serializeAnswers(answers),
    occurredAt,
    status: complete ? "COMPLETED" : "DRAFT",
    signedName: complete ? signedName : signedName,
    signedAt: complete ? new Date() : null,
  };

  if (id) {
    const existing = await prisma.anamnesis.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!existing) return { error: "Anamnese não encontrada." };
    await prisma.anamnesis.update({ where: { id }, data: payload });
  } else {
    await prisma.anamnesis.create({
      data: { tenantId: session.tenantId, ...payload },
    });
  }

  revalidateClient(clientId);
  return { ok: true, alerts: collectAlerts(questions, answers).length };
}

function parsePostedAnswers(formData: FormData, questions: AnamnesisQuestion[]) {
  const raw = String(formData.get("answers") ?? "");
  if (raw) {
    const parsed = parseAnswers(raw);
    if (Object.keys(parsed).length) return parsed;
  }
  const answers: Record<string, AnamnesisAnswer> = {};
  for (const question of questions) {
    const value = String(formData.get(`answer_${question.id}`) ?? "").trim();
    const detail = String(formData.get(`detail_${question.id}`) ?? "").trim();
    answers[question.id] = { value, detail: detail || undefined };
  }
  return answers;
}

export async function deleteAnamnesis(formData: FormData) {
  const { session } = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.anamnesis.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return { error: "Anamnese não encontrada." };
  await prisma.anamnesis.delete({ where: { id } });
  revalidateClient(existing.clientId);
  return { ok: true };
}

export async function createAnamnesisInvite(formData: FormData) {
  const { session, tenant } = await requireTenant();
  await ensureAnamnesisForms(session.tenantId);
  const clientId = String(formData.get("clientId") ?? "");
  const formId = String(formData.get("formId") ?? "");
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: session.tenantId } });
  if (!client) return { error: "Cliente não encontrado." };
  const form = await prisma.anamnesisForm.findFirst({
    where: { id: formId, tenantId: session.tenantId, active: true },
  });
  if (!form) return { error: "Selecione uma ficha de anamnese." };

  const existing = await prisma.anamnesis.findFirst({
    where: { tenantId: session.tenantId, clientId, formId, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
  });
  const token = existing?.publicToken || createAnamnesisInviteToken();
  const record = existing
    ? await prisma.anamnesis.update({
        where: { id: existing.id },
        data: { publicToken: token },
      })
    : await prisma.anamnesis.create({
        data: {
          tenantId: session.tenantId,
          clientId,
          formId,
          status: "DRAFT",
          publicToken: token,
        },
      });

  const integrations = await resolvePlatformIntegrations();
  const url = anamnesisInviteUrl(token, integrations.publicAppUrl || tenant.publicAppUrl);
  revalidateClient(clientId);
  return {
    ok: true as const,
    url,
    token,
    recordId: record.id,
    message: anamnesisInviteMessage(client.name, tenant.tradeName || tenant.name, url),
    whatsapp: client.phone ? `https://wa.me/${toEvolutionNumber(client.phone)}` : "",
  };
}

export async function submitPublicAnamnesis(formData: FormData) {
  const token = sanitizeAnamnesisToken(String(formData.get("token") ?? ""));
  if (!token) return { error: "Link inválido." };
  const record = await prisma.anamnesis.findUnique({
    where: { publicToken: token },
    include: { form: true, client: { select: { id: true, name: true } } },
  });
  if (!record) return { error: "Este link não existe ou já expirou." };
  if (record.status === "COMPLETED") return { error: "Esta ficha já foi enviada." };

  const questions = parseQuestions(record.form.questions);
  const answers = parsePostedAnswers(formData, questions);
  const missing = missingRequired(questions, answers);
  if (missing.length) {
    return { error: `Preencha as perguntas obrigatórias: ${missing.join(", ")}.` };
  }
  const signedName = String(formData.get("signedName") ?? "").trim();
  if (!signedName) return { error: "Digite seu nome completo para assinar a ficha." };

  await prisma.anamnesis.update({
    where: { id: record.id },
    data: {
      answers: serializeAnswers(answers),
      signedName,
      signedAt: new Date(),
      occurredAt: new Date(),
      status: "COMPLETED",
    },
  });
  revalidateClient(record.clientId);
  return { ok: true as const, name: record.client.name };
}
