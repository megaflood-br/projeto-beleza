import Link from "next/link";
import { PackageMinus, Tag } from "lucide-react";
import { formatBRL } from "@/lib/money";
import { formatStockQty } from "@/lib/stock";

export type LowStockAlertItem = {
  productId: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  supplierName: string | null;
  supplierPriceCents: number | null;
  query: string;
};

export type SupplierDealCard = {
  id: string;
  name: string;
  label: string;
  supplierName: string;
  productName: string;
  query: string;
};

export function LowStockAlert({ items }: { items: LowStockAlertItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-950">
        <PackageMinus size={16} />
        Estoque baixo
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.productId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <span className="font-medium">{item.name}</span>
              <span className="text-amber-900/80">
                {" "}
                · {formatStockQty(item.stock, item.unit)} (mín. {formatStockQty(item.minStock, item.unit)})
              </span>
              {item.supplierName ? (
                <span className="block text-xs text-amber-900/80">
                  {item.supplierName} tem no catálogo
                  {item.supplierPriceCents != null ? ` por ${formatBRL(item.supplierPriceCents)}` : ""}
                </span>
              ) : (
                <span className="block text-xs text-amber-900/80">Nenhum fornecedor da sua região com este item agora.</span>
              )}
            </span>
            {item.supplierName ? (
              <Link
                href={`/fornecedores?q=${encodeURIComponent(item.query)}`}
                className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Pedir do fornecedor
              </Link>
            ) : (
              <Link href="/fornecedores" className="text-xs font-medium text-amber-950 underline">
                Ver fornecedores
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SupplierDealStrip({ deals }: { deals: SupplierDealCard[] }) {
  if (!deals.length) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Tag size={16} className="text-rose-600" />
        Ofertas dos fornecedores
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {deals.map((deal) => (
          <Link
            key={`${deal.id}-${deal.productName}`}
            href={`/fornecedores?q=${encodeURIComponent(deal.query)}`}
            className="min-w-[220px] rounded-2xl bg-[#fff1e6] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          >
            <div className="text-[11px] font-semibold tracking-wide text-rose-700 uppercase">Só nesta região</div>
            <div className="mt-1 font-medium">{deal.label}</div>
            <div className="text-sm text-ink-soft">{deal.productName}</div>
            <div className="mt-1 text-xs text-ink-soft">{deal.supplierName}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
