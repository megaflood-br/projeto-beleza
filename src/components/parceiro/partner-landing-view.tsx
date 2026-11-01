import Link from "next/link";
import {
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  Coins,
  FileText,
  FolderOpen,
  Headphones,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Percent,
  Receipt,
  Scissors,
  Settings,
  Sparkles,
  Tag,
  Target,
  Truck,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { LandingPlanCard, PartnerLandingPage } from "@/lib/partner-landing";
import { LANDING_AUDIENCES, LANDING_CATALOG, LANDING_STEPS, type LandingCatalogIcon } from "@/lib/landing-catalog";

const ICONS: Record<LandingCatalogIcon, LucideIcon> = {
  agenda: CalendarDays,
  atendimento: MessageCircle,
  comandas: Receipt,
  clientes: Users,
  anamnese: ClipboardList,
  equipe: UsersRound,
  usuarios: UserCog,
  servicos: Scissors,
  estoque: Boxes,
  fornecedores: Truck,
  promocoes: Tag,
  cadastros: Landmark,
  painel: LayoutDashboard,
  financeiro: Wallet,
  comissoes: Percent,
  metas: Target,
  notas: FileText,
  cashback: Coins,
  marketing: Megaphone,
  documentacao: FolderOpen,
  ia: Sparkles,
  avisos: Bell,
  suporte: Headphones,
  config: Settings,
};

function signupHref(slug: string) {
  return slug ? `/cadastro?ref=${encodeURIComponent(slug)}` : "/cadastro";
}

function loginHref(slug: string) {
  return slug ? `/login?ref=${encodeURIComponent(slug)}` : "/login";
}

export function PartnerLandingView({
  landing,
  plans = [],
}: {
  landing: PartnerLandingPage;
  plans?: LandingPlanCard[];
}) {
  const signup = signupHref(landing.slug);
  const login = loginHref(landing.slug);
  const brand = landing.name || "MegaBeauty";

  return (
    <main className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <BrandMark imgClassName="h-10 max-w-[12rem] sm:h-12 sm:max-w-[16rem]" />
          <nav className="hidden items-center gap-5 text-sm font-medium text-ink-soft lg:flex">
            <a href="#funcionalidades" className="hover:text-ink">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="hover:text-ink">
              Como funciona
            </a>
            {plans.length ? (
              <a href="#planos" className="hover:text-ink">
                Planos
              </a>
            ) : null}
          </nav>
          <div className="flex shrink-0 gap-2 sm:gap-3">
            <Link href={login} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink sm:px-4">
              Entrar
            </Link>
            <Link href={signup} className="rounded-lg bg-wine px-3 py-2 text-sm font-medium text-white sm:px-4">
              {landing.cta}
            </Link>
          </div>
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
          <p className="mt-6 text-sm text-ink-soft">{LANDING_AUDIENCES.join(" · ")}</p>
        </div>
        {landing.imageUrl ? (
          <img src={landing.imageUrl} alt="" className="w-full object-contain" />
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

      {landing.features.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <p className="text-sm font-medium text-wine">O que muda no dia a dia</p>
          <h2 className="mt-2 font-display text-3xl">Menos retrabalho. Mais horário preenchido.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {landing.features.map((feature) => (
              <article key={feature.title} className="rounded-xl border border-line bg-paper p-5">
                <h3 className="font-display text-xl">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="funcionalidades" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-medium text-wine">Funcionalidades</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl">Tudo que o salão precisa, no mesmo sistema.</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Agenda, atendimento, caixa, estoque, fiscal e marketing. O {brand} cobre a operação inteira — não só o horário
          marcado.
        </p>
        <div className="mt-10 space-y-12">
          {LANDING_CATALOG.map((group) => (
            <div key={group.id}>
              <div className="max-w-2xl">
                <h3 className="font-display text-2xl">{group.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{group.text}</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <article key={item.title} className="rounded-xl border border-line bg-paper p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-soft text-wine">
                        <Icon size={18} />
                      </div>
                      <h4 className="mt-4 font-display text-lg">{item.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-paper">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-medium text-wine">Como funciona</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Do cadastro ao primeiro atendimento.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {LANDING_STEPS.map((step, index) => (
              <article key={step.title} className="rounded-xl border border-line bg-cream p-5">
                <div className="text-sm font-medium text-wine">0{index + 1}</div>
                <h3 className="mt-3 font-display text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {plans.length ? (
        <section id="planos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-medium text-wine">Planos</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Escolha o ritmo do seu salão.</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">Comece no essencial e cresça sem trocar de sistema.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.slug}
                className={`flex flex-col rounded-xl border bg-paper p-5 ${
                  plan.highlighted ? "border-wine shadow-sm" : "border-line"
                }`}
              >
                <h3 className="font-display text-2xl">{plan.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{plan.description}</p>
                <div className="mt-4 font-display text-3xl">{plan.price}</div>
                {plan.trialDays > 0 ? (
                  <p className="mt-1 text-xs text-ink-soft">{plan.trialDays} dias para experimentar</p>
                ) : null}
                <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Link
                  href={signup}
                  className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                    plan.highlighted ? "bg-wine text-white" : "border border-line bg-cream"
                  }`}
                >
                  {landing.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-line bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl">Pronto para tirar o salão da planilha?</h2>
            <p className="mt-3 text-slate-300">
              Abra sua conta no {brand} e organize agenda, caixa e clientes no mesmo lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={signup} className="rounded-lg bg-wine px-6 py-3 text-sm font-medium text-white">
              {landing.cta}
            </Link>
            <Link href={login} className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white">
              Já sou cliente
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-soft sm:px-6">
          <span>{brand}</span>
          <div className="flex gap-4">
            <a href="#funcionalidades">Funcionalidades</a>
            <Link href={login}>Entrar</Link>
            <Link href={signup}>{landing.cta}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
