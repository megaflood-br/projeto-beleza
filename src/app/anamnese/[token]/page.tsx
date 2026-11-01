import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseQuestions, sanitizeAnamnesisToken } from "@/lib/anamnesis";
import { PublicAnamnesisForm } from "@/components/anamneses/public-anamnesis-form";

export default async function PublicAnamnesisPage({ params }: { params: Promise<{ token: string }> }) {
  const token = sanitizeAnamnesisToken((await params).token);
  if (!token) notFound();
  const record = await prisma.anamnesis.findUnique({
    where: { publicToken: token },
    include: {
      client: { select: { name: true } },
      form: true,
      tenant: { select: { name: true, tradeName: true, logoUrl: true } },
    },
  });
  if (!record) notFound();

  const salon = record.tenant.tradeName || record.tenant.name;
  const questions = parseQuestions(record.form.questions);
  const completed = record.status === "COMPLETED";

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-10">
      {record.tenant.logoUrl ? (
        <img src={record.tenant.logoUrl} alt={salon} className="h-12 w-auto max-w-[16rem] object-contain object-left" />
      ) : null}
      <p className="mt-6 text-sm font-medium text-ink-soft">{salon}</p>
      <h1 className="mt-2 font-display text-3xl">{record.form.name}</h1>
      <p className="mt-2 text-ink-soft">
        {completed
          ? `${record.client.name}, esta ficha já foi enviada.`
          : `${record.client.name}, preencha a ficha antes do atendimento.`}
      </p>
      {record.form.description ? <p className="mt-2 text-sm text-ink-soft">{record.form.description}</p> : null}
      <div className="mt-8">
        {completed ? (
          <div className="rounded-2xl border border-line bg-paper p-6 text-sm text-ink-soft">
            O salão já recebeu suas respostas. Se precisar alterar, fale com a recepção.
          </div>
        ) : (
          <PublicAnamnesisForm
            token={token}
            clientName={record.client.name}
            questions={questions}
            initialAnswers={record.answers}
          />
        )}
      </div>
    </main>
  );
}
