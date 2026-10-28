"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
};

export function SidebarLayout({
  plan,
  title,
  userName,
  items,
  badge,
  banner,
  headerAction,
  children,
}: {
  plan: string;
  title: string;
  userName: string;
  items: SidebarNavItem[];
  badge?: (href: string) => ReactNode;
  banner?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = items.find((item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh bg-cream">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-dvh md:w-64 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 py-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 text-lg font-semibold tracking-tight">
              Mega<span className="text-blue-400">Beauty</span>
            </div>
            {headerAction ? <div className="text-slate-300 hover:[&_a]:bg-white/10">{headerAction}</div> : null}
            <button
              type="button"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-1 text-xs font-medium tracking-wider text-slate-400 uppercase">{plan}</div>
          <div className="mt-3 truncate text-sm text-slate-300">{title}</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => {
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
                {badge?.(item.href)}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 truncate text-sm text-slate-300">{userName}</div>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur md:hidden pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="rounded-lg p-2 text-ink hover:bg-sand"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {pathname.startsWith("/avisos") ? "Avisos" : (current?.label ?? "MegaBeauty")}
            </div>
            <div className="truncate text-xs text-ink-soft">{title}</div>
          </div>
          {headerAction ? <div className="text-ink">{headerAction}</div> : null}
        </header>
        <main className="min-w-0 flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8 [&_h1]:text-2xl md:[&_h1]:text-3xl">
          {banner}
          {children}
        </main>
      </div>
    </div>
  );
}
