"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Scissors,
  Boxes,
  Percent,
  Wallet,
  MessageCircle,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/comissoes", label: "Comissões", icon: Percent },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/ia", label: "Assistente IA", icon: Sparkles },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({
  children,
  salon,
  userName,
  plan,
}: {
  children: React.ReactNode;
  salon: string;
  userName: string;
  plan: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[#1c1210] text-[#f7f1ea]">
        <div className="px-5 py-6">
          <div className="font-display text-2xl">Aura</div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[#c4a574]">{plan}</div>
          <div className="mt-4 truncate text-sm text-[#e8d7bd]">{salon}</div>
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
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active ? "bg-wine text-white" : "text-[#e8d7bd] hover:bg-white/5",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-4">
          <div className="mb-3 text-sm text-[#e8d7bd]">{userName}</div>
          <button className="flex items-center gap-2 text-sm text-[#c4a574] hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
