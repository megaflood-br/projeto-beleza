"use client";

import { ClipboardList, Package, Settings } from "lucide-react";
import { stopImpersonation } from "@/app/actions/platform";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { SidebarLayout, type SidebarNavItem } from "@/components/sidebar-layout";

const NAV: SidebarNavItem[] = [
  { href: "/fornecedor", label: "Produtos", icon: Package, exact: true },
  { href: "/fornecedor/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/fornecedor/empresa", label: "Empresa", icon: Settings },
];

export function SupplierShell({
  children,
  company,
  userName,
  impersonatorName,
}: {
  children: React.ReactNode;
  company: string;
  userName: string;
  impersonatorName?: string | null;
}) {
  return (
    <ConfirmProvider>
      <SidebarLayout
        plan="Fornecedor"
        title={company}
        userName={userName}
        items={NAV}
        banner={
          impersonatorName ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
              <span>
                Você entrou como suporte na empresa <strong>{company}</strong> ({impersonatorName}).
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
    </ConfirmProvider>
  );
}
