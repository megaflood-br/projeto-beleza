import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import type { PartnerLandingPage } from "@/lib/partner-landing";

export function PartnerLandingView({ landing }: { landing: PartnerLandingPage }) {
  const signup = landing.slug ? `/cadastro?ref=${encodeURIComponent(landing.slug)}` : "/cadastro";
  const login = landing.slug ? `/login?ref=${encodeURIComponent(landing.slug)}` : "/login";

  return (
    <main className="min-h-dvh bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <BrandMark imgClassName="h-12 max-w-[16rem] sm:h-14 sm:max-w-[20rem]" />
        <div className="flex shrink-0 gap-2 sm:gap-3">
          <Link href={login} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink">
            Entrar
          </Link>
          <Link href={signup} className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-white">
            {landing.cta}
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink-soft">{landing.kicker}</p>
          <h1 className="mt-4 font-display text-3xl leading-[1.15] sm:text-5xl md:text-6xl">{landing.headline}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">{landing.text}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signup} className="rounded-lg bg-wine px-6 py-3 text-sm font-medium text-white">
              {landing.cta}
            </Link>
            <Link href={login} className="rounded-lg border border-line bg-paper px-6 py-3 text-sm font-medium">
              Já sou cliente
            </Link>
          </div>
        </div>
        {landing.imageUrl ? (
          <img src={landing.imageUrl} alt="" className="w-full rounded-2xl border border-line object-cover shadow-sm" />
        ) : (
          <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
            <div className="mb-4 text-sm text-ink-soft">Agenda do dia</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
        )}
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 sm:pb-20 md:grid-cols-2 lg:grid-cols-3">
        {landing.features.map((feature) => (
          <article key={feature.title} className="rounded-xl border border-line bg-paper p-5">
            <h2 className="font-display text-xl">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
