"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Plus, Tag, X } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { ProductDrawer } from "@/components/estoque/product-drawer";
import { createProductLot, createProductRequest, moveStock, reviewProductRequest } from "@/app/actions/inventory";
import { REQUEST_STATUS_LABEL } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import { isLowStock, stockUnitLabel } from "@/lib/stock";
import { cn, initials } from "@/lib/utils";
import type { ProductFormValue, ProductLotValue, ProductRequestValue } from "@/components/estoque/types";

type Tab = "produtos" | "lotes" | "solicitacoes";
type ExtraDrawer = "lote" | "solicitacao" | "movimento" | null;

export function StockBoard({
  products,
  categories,
  brands,
  services,
  lots,
  requests,
  professionals,
}: {
  products: ProductFormValue[];
  categories: { id: string; name: string }[];
  brands: string[];
  services: { id: string; name: string }[];
  lots: ProductLotValue[];
  requests: ProductRequestValue[];
  professionals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("produtos");
  const [editing, setEditing] = useState<ProductFormValue | null | undefined>(undefined);
  const [extra, setExtra] = useState<ExtraDrawer>(null);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl">Estoque</h1>
        <div className="flex flex-wrap gap-2">
          {tab === "produtos" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setExtra("movimento")}>
                Movimentar
              </Button>
              <Button type="button" onClick={() => setEditing(null)}>
                <Plus size={16} />
                Novo produto
              </Button>
            </>
          ) : null}
          {tab === "lotes" ? (
            <Button type="button" onClick={() => setExtra("lote")}>
              <Plus size={16} />
              Novo lote
            </Button>
          ) : null}
          {tab === "solicitacoes" ? (
            <Button type="button" onClick={() => setExtra("solicitacao")}>
              <Plus size={16} />
              Nova solicitação
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 border-b border-line">
        <TabButton active={tab === "produtos"} onClick={() => setTab("produtos")}>
          Produtos
        </TabButton>
        <TabButton active={tab === "lotes"} onClick={() => setTab("lotes")}>
          Lotes e validades
        </TabButton>
        <TabButton active={tab === "solicitacoes"} onClick={() => setTab("solicitacoes")}>
          Solicitações
          {pendingCount ? (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {pendingCount} novo{pendingCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </TabButton>
      </div>

      {tab === "produtos" ? (
        <ProductTable products={products} onEdit={setEditing} />
      ) : null}
      {tab === "lotes" ? <LotsTable lots={lots} /> : null}
      {tab === "solicitacoes" ? (
        <RequestsTable
          requests={requests}
          onReview={async (id, status) => {
            const result = await reviewProductRequest(id, status);
            if (result && "error" in result && result.error) {
              window.alert(result.error);
              return;
            }
            router.refresh();
          }}
        />
      ) : null}

      {editing !== undefined ? (
        <ProductDrawer
          key={editing?.id ?? "new"}
          open
          product={editing}
          categories={categories}
          brands={brands}
          services={services}
          onClose={() => setEditing(undefined)}
        />
      ) : null}

      {extra === "lote" ? (
        <SimpleDrawer title="Novo lote" onClose={() => setExtra(null)} action={createProductLot}>
          <Field label="Produto" required>
            <SearchSelect
              name="productId"
              required
              placeholder="Buscar produto..."
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Código do lote" required>
            <Input name="code" required placeholder="Lote / NF" />
          </Field>
          <Field label="Quantidade" required>
            <Input name="quantity" type="number" min={0.1} step="0.1" defaultValue={1} />
          </Field>
          <Field label="Validade" required>
            <Input name="expiresAt" type="date" required />
          </Field>
        </SimpleDrawer>
      ) : null}

      {extra === "solicitacao" ? (
        <SimpleDrawer title="Nova solicitação" onClose={() => setExtra(null)} action={createProductRequest}>
          <Field label="Produto" required>
            <SearchSelect
              name="productId"
              required
              placeholder="Buscar produto..."
              options={products.filter((p) => p.requestAvailable).map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Profissional">
            <SearchSelect
              name="professionalId"
              placeholder="Quem solicita..."
              emptyOption={{ value: "", label: "Sem profissional" }}
              options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Quantidade" required>
            <Input name="quantity" type="number" min={0.1} step="0.1" defaultValue={1} />
          </Field>
          <Field label="Observações">
            <Input name="notes" placeholder="Uso interno, cliente..." />
          </Field>
        </SimpleDrawer>
      ) : null}

      {extra === "movimento" ? (
        <SimpleDrawer title="Movimentar estoque" onClose={() => setExtra(null)} action={moveStock} submitLabel="Registrar">
          <Field label="Produto" required>
            <SearchSelect
              name="productId"
              required
              placeholder="Buscar produto..."
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Tipo">
            <Select name="type">
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
              <option value="ADJUST">Ajuste (define saldo)</option>
            </Select>
          </Field>
          <Field label="Quantidade">
            <Input name="quantity" type="number" step="0.1" defaultValue={1} />
          </Field>
          <Field label="Motivo">
            <Input name="reason" placeholder="Compra, perda, uso..." />
          </Field>
        </SimpleDrawer>
      ) : null}
    </div>
  );
}

function ProductTable({
  products,
  onEdit,
}: {
  products: ProductFormValue[];
  onEdit: (product: ProductFormValue) => void;
}) {
  const rows = useMemo(() => products, [products]);
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-ink-soft">Nenhum produto cadastrado.</p>
      ) : (
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[1fr_160px_120px] items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-medium text-ink-soft">
            <span className="pl-12">Nome</span>
            <span>Marca</span>
            <span className="text-right">Estoque</span>
          </div>
          <ul>
            {rows.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="grid w-full grid-cols-[1fr_160px_120px] items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-semibold text-white"
                      style={{ background: "#2563EB" }}
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(p.name)
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-blue-700">{p.name}</span>
                        <FlaskConical size={14} className="shrink-0 text-slate-400" />
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {p.categoryName ?? "Sem categoria"}
                        {p.saleCents ? ` · ${formatBRL(p.saleCents)}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="truncate text-sm text-ink">{p.brand ?? "—"}</span>
                  <span className="text-right">
                    <span className={cn("block text-sm font-medium", isLowStock(p.stock, p.minStock) ? "text-warn" : "")}>
                      {p.stock} {stockUnitLabel(p.unit)}
                    </span>
                    {isLowStock(p.stock, p.minStock) ? (
                      <span className="text-xs text-warn">mín. {p.minStock}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LotsTable({ lots }: { lots: ProductLotValue[] }) {
  if (lots.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-4 py-12 text-center text-sm text-ink-soft">
        Nenhum lote cadastrado.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="grid grid-cols-[1fr_140px_100px_120px] gap-2 border-b border-line px-4 py-2.5 text-sm font-medium text-ink-soft">
        <span>Produto</span>
        <span>Lote</span>
        <span>Qtd</span>
        <span>Validade</span>
      </div>
      <ul>
        {lots.map((lot) => {
          const expired = new Date(lot.expiresAt).getTime() < Date.now();
          return (
            <li key={lot.id} className="grid grid-cols-[1fr_140px_100px_120px] gap-2 border-b border-line px-4 py-3 last:border-0">
              <div>
                <div className="font-medium text-blue-700">{lot.productName}</div>
                <div className="text-xs text-ink-soft">{lot.brand ?? "Sem marca"}</div>
              </div>
              <div className="text-sm">{lot.code}</div>
              <div className="text-sm">
                {lot.quantity} {stockUnitLabel(lot.unit)}
              </div>
              <div className={cn("text-sm", expired ? "text-warn" : "")}>{formatShortDate(new Date(lot.expiresAt))}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RequestsTable({
  requests,
  onReview,
}: {
  requests: ProductRequestValue[];
  onReview: (id: string, status: "APPROVED" | "REJECTED") => Promise<void>;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white px-4 py-12 text-center text-sm text-ink-soft">
        Nenhuma solicitação.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <ul>
        {requests.map((req) => (
          <li key={req.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-700">{req.productName}</span>
                <Tag size={14} className="text-slate-400" />
              </div>
              <div className="text-xs text-ink-soft">
                {req.professionalName ?? "Recepção"} · {req.quantity} {stockUnitLabel(req.unit)} · {formatShortDate(new Date(req.createdAt))}
                {req.notes ? ` · ${req.notes}` : ""}
              </div>
            </div>
            {req.status === "PENDING" ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onReview(req.id, "REJECTED")}>
                  Recusar
                </Button>
                <Button type="button" onClick={() => onReview(req.id, "APPROVED")}>
                  Aprovar
                </Button>
              </div>
            ) : (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  req.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-ink-soft",
                )}
              >
                {REQUEST_STATUS_LABEL[req.status] ?? req.status}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center border-b-2 px-4 py-2.5 text-sm",
        active ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function SimpleDrawer({
  title,
  onClose,
  action,
  submitLabel = "Salvar",
  children,
}: {
  title: string;
  onClose: () => void;
  action: (formData: FormData) => Promise<{ error?: string } | { ok?: boolean }>;
  submitLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Fechar" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          <div className="grid flex-1 gap-3 overflow-y-auto px-5 py-4">{children}</div>
          {error ? <p className="px-5 text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : submitLabel}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
