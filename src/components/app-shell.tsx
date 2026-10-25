"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  Users,
  UserCog,
  Scissors,
  Boxes,
  Percent,
  Wallet,
  Receipt,
  Landmark,
  MessageCircle,
  Sparkles,
  Settings,
  Target,
  FileText,
  Tag,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { stopImpersonation } from "@/app/actions/platform";
import { SupportCallOverlay } from "@/components/suporte/call-overlay";
import { SupportLiveProvider, useSupportLive } from "@/components/suporte/live-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/anamneses", label: "Anamnese", icon: ClipboardList },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: UserCog },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/comandas", label: "Comandas", icon: Receipt },
  { href: "/promocoes", label: "Promoções", icon: Tag },
  { href: "/notas", label: "Notas fiscais", icon: FileText },
  { href: "/comissoes", label: "Comissões", icon: Percent },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/cadastros", label: "Cadastros", icon: Landmark },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/suporte", label: "Suporte", icon: Headphones },
  { href: "/ia", label: "Assistente IA", icon: Sparkles },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function SupportNavBadge({ href }: { href: string }) {
  const { state } = useSupportLive();
  if (href !== "/suporte") return null;
  const ringing = state?.ringingCalls.filter((call) => call.startedById !== state.me.id).length ?? 0;
  const unread = state?.unread ?? 0;
  if (!ringing && !unread) return null;
  return (
    <span className="ml-auto rounded-full bg-white/20 px-1.5 text-[10px] font-semibold">
      {ringing ? "ao vivo" : unread}
    </span>
  );
}

export function AppShell({
  children,
  salon,
  userName,
  plan,
  impersonatorName,
}: {
  children: React.ReactNode;
  salon: string;
  userName: string;
  plan: string;
  impersonatorName?: string | null;
}) {
  const pathname = usePathname();

  return (
    <SupportLiveProvider>
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white">
        <div className="px-5 py-6">
          <div className="text-lg font-semibold tracking-tight">
            Mega<span className="text-blue-400">Beauty</span>
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">{plan}</div>
          <div className="mt-4 truncate text-sm text-slate-300">{salon}</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={18} />
                {item.label}
                <SupportNavBadge href={item.href} />
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-4">
          <div className="mb-3 text-sm text-slate-300">{userName}</div>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        {impersonatorName ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
            <span>
              Você entrou como suporte no salão <strong>{salon}</strong> ({impersonatorName}).
            </span>
            <form action={stopImpersonation}>
              <button type="submit" className="font-medium underline">
                Voltar à plataforma
              </button>
            </form>
          </div>
        ) : null}
        {children}
      </main>
    </div>
    <SupportCallOverlay />
    </SupportLiveProvider>
  );
}
