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
} from "lucide-react";
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
  return (
    <ConfirmProvider>
      <SupportLiveProvider>
        <SidebarLayout
          plan={plan}
          title={salon}
          userName={userName}
          items={NAV}
          badge={(href) => <SupportNavBadge href={href} />}
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
