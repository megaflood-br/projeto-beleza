"use client";

import { BadgePercent, Building2, Headphones, Plug, Shield, Truck } from "lucide-react";
import { SupportCallOverlay } from "@/components/suporte/call-overlay";
import { SupportLiveProvider, useSupportLive } from "@/components/suporte/live-context";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { SidebarLayout, type SidebarNavItem } from "@/components/sidebar-layout";

const NAV: SidebarNavItem[] = [
  { href: "/plataforma", label: "Contas", icon: Building2, exact: true },
  { href: "/plataforma/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/plataforma/usuarios", label: "Usuários", icon: Shield },
  { href: "/plataforma/planos", label: "Planos", icon: BadgePercent },
  { href: "/plataforma/integracoes", label: "Integrações", icon: Plug },
  { href: "/plataforma/suporte", label: "Suporte", icon: Headphones },
];

function NavBadge({ href }: { href: string }) {
  const { state } = useSupportLive();
  if (href !== "/plataforma/suporte") return null;
  const ringing = state?.ringingCalls.filter((call) => call.startedById !== state.me.id).length ?? 0;
  const unread = state?.unread ?? 0;
  if (!ringing && !unread) return null;
  return (
    <span className="ml-auto rounded-full bg-white/20 px-1.5 text-[10px] font-semibold">
      {ringing ? "ao vivo" : unread}
    </span>
  );
}

export function PlatformShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  return (
    <ConfirmProvider>
      <SupportLiveProvider>
        <SidebarLayout
          plan="Plataforma"
          title="Revenda e contas"
          userName={userName}
          items={NAV}
          badge={(href) => <NavBadge href={href} />}
        >
          {children}
        </SidebarLayout>
        <SupportCallOverlay />
      </SupportLiveProvider>
    </ConfirmProvider>
  );
}
