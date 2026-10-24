import { requirePlatformAdmin } from "@/lib/tenant";
import { logoutAction } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requirePlatformAdmin();
  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white">
        <div className="px-5 py-6">
          <div className="text-lg font-semibold tracking-tight">
            Mega<span className="text-blue-400">Beauty</span>
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Plataforma</div>
          <div className="mt-4 truncate text-sm text-slate-300">Revenda e contas</div>
        </div>
        <nav className="flex-1 px-3">
          <div className="rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium">Contas</div>
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-4">
          <div className="mb-3 text-sm text-slate-300">{session.name}</div>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <LogOut size={16} /> Sair
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
