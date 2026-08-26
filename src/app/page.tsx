import Link from "next/link";

const FEATURES = [
  { title: "Agenda por profissional", text: "Colunas por colaborador, status coloridos, conflito de horário e agendamento online 24h." },
  { title: "CRM de beleza", text: "Histórico, tags, LTV, origem (balcão, WhatsApp, link) e fichas prontas para a recepção." },
  { title: "WhatsApp + Evolution API", text: "Inbox do salão, confirmações, lembretes e webhook por tenant." },
  { title: "IA OpenAI", text: "Assistente que lê agenda, ocupação, no-show e estoque. Chave por salão." },
  { title: "Estoque e comissões", text: "Baixa automática no término do serviço, regras por profissional ou serviço, pagamento em lote." },
  { title: "Multi-tenant", text: "Cada salão é um workspace isolado. TypeScript, Next.js e Prisma de ponta a ponta." },
];

function Logo({ className = "text-xl" }: { className?: string }) {
  return (
    <div className={`font-semibold tracking-tight ${className}`}>
      Mega<span className="text-wine">Beauty</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink">
            Entrar
          </Link>
          <Link href="/cadastro" className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-white">
            Criar conta
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-soft">CRM para salões, barbearias e clínicas</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.1] md:text-6xl">
            Menos tempo na gestão. Mais tempo com o cliente.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            MegaBeauty é o sistema multi-tenant com agenda visual, financeiro, equipe, estoque, comissões, WhatsApp e inteligência artificial — feito em TypeScript para o mercado da beleza.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-lg bg-wine px-6 py-3 text-sm font-medium text-white">
              Ver demo (Studio Aurora)
            </Link>
            <Link href="/agendar/studio-aurora" className="rounded-lg border border-line bg-paper px-6 py-3 text-sm font-medium">
              Agendar como cliente
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
          <div className="mb-4 text-sm text-ink-soft">Hoje · Studio Aurora</div>
          <div className="grid grid-cols-3 gap-2">
            {["Camila", "Rafaela", "Bruno"].map((name, i) => (
              <div key={name} className="rounded-xl bg-sand p-3">
                <div className="text-sm font-medium">{name}</div>
                <div className={`mt-3 rounded-lg p-2 text-xs text-white ${i === 2 ? "bg-success" : "bg-wine"}`}>
                  {i === 0 ? "09:00 Coloração" : i === 1 ? "10:00 Limpeza" : "11:00 Barba"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} className="rounded-xl border border-line bg-paper p-5">
            <h2 className="font-display text-xl">{f.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{f.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
