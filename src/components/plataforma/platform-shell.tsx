"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePercent, Building2, Headphones, LogOut, Plug, Shield } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { SupportCallOverlay } from "@/components/suporte/call-overlay";
import { SupportLiveProvider, useSupportLive } from "@/components/suporte/live-context";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/plataforma", label: "Contas", icon: Building2, exact: true },
  { href: "/plataforma/usuarios", label: "Usuários", icon: Shield, exact: false },
  { href: "/plataforma/planos", label: "Planos", icon: BadgePercent, exact: false },
  { href: "/plataforma/integracoes", label: "Integrações", icon: Plug, exact: false },
  { href: "/plataforma/suporte", label: "Suporte", icon: Headphones, exact: false },
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

function PlatformNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <NavBadge href={item.href} />
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
    </>
  );
}

export function PlatformShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  return (
    <ConfirmProvider>
    <SupportLiveProvider>
      <div className="flex min-h-screen bg-cream">
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white">
          <div className="px-5 py-6">
            <div className="text-lg font-semibold tracking-tight">
              Mega<span className="text-blue-400">Beauty</span>
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Plataforma</div>
            <div className="mt-4 truncate text-sm text-slate-300">Revenda e contas</div>
          </div>
          <PlatformNav userName={userName} />
        </aside>
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
      <SupportCallOverlay />
    </SupportLiveProvider>
    </ConfirmProvider>
  );
}
