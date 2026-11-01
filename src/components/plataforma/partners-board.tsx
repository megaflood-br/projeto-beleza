"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Pencil, Plus } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { PartnerDrawer } from "@/components/plataforma/partner-drawer";
import { impersonateTenant } from "@/app/actions/platform";
import { setPartnerStatus } from "@/app/actions/platform-partners";
import { useConfirm } from "@/components/confirm-dialog";
import { PARTNER_STATUS_COLOR, PARTNER_STATUS_LABEL, commissionBpsToPercent } from "@/lib/partners";
import { formatBRL } from "@/lib/money";
import { formAction } from "@/lib/utils";
import type { PartnerAccountRow } from "@/components/plataforma/partner-types";

export function PartnersBoard({ accounts }: { accounts: PartnerAccountRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PartnerAccountRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((row) => {
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.slug.includes(q) || row.ownerEmail.toLowerCase().includes(q);
    });
  }, [accounts, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Parceiros</h1>
          <p className="mt-1 text-sm text-ink-soft">Influenciadores com link próprio e white label do sistema.</p>
        </div>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo parceiro
        </Button>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, slug ou e-mail" />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum parceiro cadastrado.</p>
        ) : (
          <ul>
            {visible.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-ink-soft">
                    /cadastro?ref={row.slug} · {commissionBpsToPercent(row.commissionBps)}% · {row.referred} salão
                    {row.referred === 1 ? "" : "ns"} · {formatBRL(row.earnedCents)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={PARTNER_STATUS_COLOR[row.status]}>{PARTNER_STATUS_LABEL[row.status]}</Badge>
                  <Button type="button" variant="ghost" onClick={() => setEditing(row)}>
                    <Pencil size={14} />
                  </Button>
                  <form action={formAction(impersonateTenant)}>
                    <input type="hidden" name="id" value={row.tenantId} />
                    <Button type="submit" variant="outline">
                      <LogIn size={14} />
                      Entrar
                    </Button>
                  </form>
                  {row.status !== "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const fd = new FormData();
                        fd.set("id", row.id);
                        fd.set("status", "ACTIVE");
                        const result = await setPartnerStatus(fd);
                        if (result && "error" in result && result.error) setError(result.error);
                        else router.refresh();
                      }}
                    >
                      Aprovar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        if (!(await confirm({ title: "Suspender este parceiro?", danger: true }))) return;
                        const fd = new FormData();
                        fd.set("id", row.id);
                        fd.set("status", "SUSPENDED");
                        const result = await setPartnerStatus(fd);
                        if (result && "error" in result && result.error) setError(result.error);
                        else router.refresh();
                      }}
                    >
                      Suspender
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editing !== undefined ? <PartnerDrawer account={editing} onClose={() => setEditing(undefined)} /> : null}
    </div>
  );
}
