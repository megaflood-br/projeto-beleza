"use client";

import {
  CalendarDays,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  Users,
  UserCog,
  Scissors,
  Boxes,
  Truck,
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
  Bell,
} from "lucide-react";
import Link from "next/link";
import { stopImpersonation } from "@/app/actions/platform";
import { SupportCallOverlay } from "@/components/suporte/call-overlay";
import { SupportLiveProvider, useSupportLive } from "@/components/suporte/live-context";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { SidebarLayout, type SidebarNavItem } from "@/components/sidebar-layout";

const NAV: SidebarNavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/anamneses", label: "Anamnese", icon: ClipboardList },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: UserCog },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
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

function NoticeBell({ count }: { count: number }) {
  return (
    <Link
      href="/avisos"
      className="relative shrink-0 rounded-lg p-1.5 text-current hover:bg-black/10"
      aria-label={count ? `${count} avisos` : "Avisos"}
    >
      <Bell size={18} />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-amber-400 px-1 text-center text-[10px] font-semibold leading-4 text-amber-950">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function NavBadges({ href }: { href: string }) {
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
  noticeCount = 0,
}: {
  children: React.ReactNode;
  salon: string;
  userName: string;
  plan: string;
  impersonatorName?: string | null;
  noticeCount?: number;
}) {
  return (
    <ConfirmProvider>
      <SupportLiveProvider>
        <SidebarLayout
          plan={plan}
          title={salon}
          userName={userName}
          items={NAV}
          badge={(href) => <NavBadges href={href} />}
          headerAction={<NoticeBell count={noticeCount} />}
          banner={
            impersonatorName ? (
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
            ) : null
          }
        >
          {children}
        </SidebarLayout>
        <SupportCallOverlay />
      </SupportLiveProvider>
    </ConfirmProvider>
  );
}
