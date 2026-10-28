import Link from "next/link";
import { MapPin, PackageMinus, Tag } from "lucide-react";
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

export function SalonCityHint({ city }: { city: string | null | undefined }) {
  if (city) return null;
  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <MapPin size={16} />
        Cidade do salão
      </div>
      <p className="text-sky-900/80">
        Cadastre a cidade em Configurações para ver fornecedores e ofertas da sua região.
      </p>
      <Link href="/configuracoes" className="mt-2 inline-block text-xs font-medium underline">
        Cadastrar cidade
      </Link>
    </section>
  );
}

export function LowStockAlert({
  items,
  always = false,
}: {
  items: LowStockAlertItem[];
  always?: boolean;
}) {
  if (!items.length && !always) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-950">
        <PackageMinus size={16} />
        Estoque baixo
      </div>
      {items.length ? (
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
      ) : (
        <p className="text-sm text-amber-900/80">
          Nenhum produto abaixo do mínimo agora. O aviso aparece quando o saldo chega no estoque mínimo.
        </p>
      )}
    </section>
  );
}

export function SupplierDealStrip({
  deals,
  always = false,
  salonCity,
}: {
  deals: SupplierDealCard[];
  always?: boolean;
  salonCity?: string | null;
}) {
  if (!deals.length && !always) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Tag size={16} className="text-rose-600" />
        Ofertas dos fornecedores
      </div>
      {deals.length ? (
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
      ) : (
        <div className="rounded-2xl border border-rose-100 bg-[#fff7f2] px-4 py-3 text-sm text-ink-soft">
          {salonCity
            ? "Nenhum fornecedor publicou oferta na sua região hoje. Quando sair um leve 5 pague 3, aparece aqui e no catálogo."
            : "Cadastre a cidade do salão para ver as ofertas da sua região."}
          <div className="mt-2">
            <Link href="/fornecedores" className="text-xs font-medium text-rose-800 underline">
              Ver catálogo
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
