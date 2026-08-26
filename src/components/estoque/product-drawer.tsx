"use client";

import { useRef, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Info, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { upsertProduct } from "@/app/actions/inventory";
import { STOCK_UNITS } from "@/lib/constants";
import { stockUnitLabel } from "@/lib/stock";
import { cn, initials } from "@/lib/utils";
import type { ProductFormValue } from "@/components/estoque/types";

const TABS = [
  { id: "cadastro", label: "Cadastro" },
  { id: "configuracoes", label: "Configurações" },
  { id: "cashback", label: "Cashback" },
  { id: "retorno", label: "Retorno" },
  { id: "servicos", label: "Serviços vinculados" },
  { id: "nota", label: "Configurar nota fiscal", disabled: true },
] as const;

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ProductDrawer({
  open,
  product,
  categories,
  brands,
  services,
  onClose,
}: {
  open: boolean;
  product: ProductFormValue | null;
  categories: { id: string; name: string }[];
  brands: string[];
  services: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("cadastro");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "un");
  const [active, setActive] = useState(product?.active ?? true);
  const [requestAvailable, setRequestAvailable] = useState(product?.requestAvailable ?? true);
  const [linked, setLinked] = useState(
    product?.services.length ? product.services : [{ serviceId: "", quantity: 1 }],
  );

  const unitShort = stockUnitLabel(unit);

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("active", active ? "1" : "0");
    formData.set("requestAvailable", requestAvailable ? "1" : "0");
    formData.set("imageUrl", imageUrl);
    formData.set("unit", unit);
    try {
      const result = await upsertProduct(formData);
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
      <aside className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{product ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {product ? <input type="hidden" name="id" value={product.id} /> : null}
          <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_1fr]">
            <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-3 lg:block lg:overflow-visible lg:border-r lg:border-b-0">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={"disabled" in item && item.disabled}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex w-full shrink-0 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap lg:rounded-none lg:border-l-2",
                    "disabled" in item && item.disabled
                      ? "cursor-not-allowed border-transparent text-slate-400"
                      : tab === item.id
                        ? "border-blue-600 bg-blue-50 font-medium text-blue-600 lg:bg-transparent"
                        : "border-transparent text-slate-600 hover:bg-sand",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              <div className={tab === "cadastro" ? "grid gap-4" : "hidden"}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-line text-lg font-semibold"
                    style={{ background: imageUrl ? undefined : name ? "#2563EB" : "#f1f5f9" }}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : name ? (
                      <span className="text-white">{initials(name)}</span>
                    ) : (
                      <ImageIcon size={28} className="text-slate-400" />
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const url = String(reader.result ?? "");
                        if (url.length > 400_000) {
                          setError("Imagem muito grande. Use uma foto menor.");
                          return;
                        }
                        setError(null);
                        setImageUrl(url);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button type="button" className="h-8 px-4 text-xs" onClick={() => fileRef.current?.click()}>
                    Alterar
                  </Button>
                </div>

                <Field label="Nome" required>
                  <Input name="name" required placeholder="Informe o nome" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Categoria" required>
                    <SearchSelect
                      name="categoryId"
                      required
                      placeholder="Categoria"
                      defaultValue={product?.categoryId ?? ""}
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </Field>
                  <Field label="Marca">
                    <Input name="brand" list="product-brands" placeholder="Marca" defaultValue={product?.brand ?? ""} />
                    <datalist id="product-brands">
                      {brands.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Preço de venda">
                    <PrefixedInput name="sale" prefix="R$" placeholder="0,00" defaultValue={product ? centsToInput(product.saleCents) : "0,00"} />
                  </Field>
                  <Field label="Custo de compra">
                    <PrefixedInput name="cost" prefix="R$" placeholder="0,00" defaultValue={product ? centsToInput(product.costCents) : "0,00"} />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Registro de saída" required>
                    <Select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
                      {STOCK_UNITS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Uma unidade equivale a">
                    <SuffixedInput name="unitEquals" suffix={unitShort} defaultValue={String(product?.unitEquals ?? 1)} />
                  </Field>
                  <Field label="Estoque mínimo">
                    <SuffixedInput
                      name="minStock"
                      suffix={unitShort}
                      info="Quando o saldo chegar nesse valor, o produto entra no alerta de estoque baixo."
                      defaultValue={String(product?.minStock ?? 0)}
                    />
                  </Field>
                  {product ? (
                    <Field label="Estoque atual">
                      <SuffixedInput name="stockDisplay" suffix={unitShort} defaultValue={String(product.stock)} disabled />
                    </Field>
                  ) : (
                    <Field label="Estoque inicial">
                      <SuffixedInput name="stock" suffix={unitShort} defaultValue="0" />
                    </Field>
                  )}
                </div>

                <ToggleRow
                  label="Disponível para solicitação"
                  hint="Profissionais podem pedir este item na aba Solicitações."
                  checked={requestAvailable}
                  onChange={setRequestAvailable}
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Preço para profissional">
                    <PrefixedInput
                      name="professionalPrice"
                      prefix="R$"
                      placeholder="0,00"
                      defaultValue={product ? centsToInput(product.professionalPriceCents) : "0,00"}
                    />
                  </Field>
                  <Field label="Custo adicional">
                    <PrefixedInput
                      name="extraCost"
                      prefix="R$"
                      placeholder="0,00"
                      defaultValue={product?.extraCostCents ? centsToInput(product.extraCostCents) : "0,00"}
                    />
                  </Field>
                  <Field label="Comissão padrão">
                    <PrefixedInput
                      name="commissionPct"
                      prefix="%"
                      placeholder="0,00"
                      defaultValue={product?.commissionPct ?? "0,00"}
                    />
                  </Field>
                  <Field label="Código do item">
                    <Input name="sku" placeholder="SKU" defaultValue={product?.sku ?? ""} />
                  </Field>
                  <Field label="Código de barras">
                    <Input name="barcode" placeholder="EAN / GTIN" defaultValue={product?.barcode ?? ""} />
                  </Field>
                </div>

                <Field label="Observações">
                  <Textarea name="notes" placeholder="Anotações" defaultValue={product?.notes ?? ""} className="min-h-28" />
                </Field>
              </div>

              <div className={tab === "configuracoes" ? "grid gap-4" : "hidden"}>
                <ToggleRow label="Produto ativo" hint="Aparece nas comandas, serviços e movimentações." checked={active} onChange={setActive} />
              </div>

              <div className={tab === "cashback" ? "grid max-w-sm gap-3" : "hidden"}>
                <Field label="Cashback (%)">
                  <Input name="cashbackPct" placeholder="0" defaultValue={product?.cashbackPct ?? ""} />
                </Field>
                <p className="text-sm text-ink-soft">Percentual creditado ao cliente na venda deste produto.</p>
              </div>

              <div className={tab === "retorno" ? "grid max-w-sm gap-3" : "hidden"}>
                <Field label="Retornar após (dias)">
                  <Input name="returnAfterDays" type="number" min={0} placeholder="30" defaultValue={product?.returnAfterDays ?? ""} />
                </Field>
                <p className="text-sm text-ink-soft">Usado para lembrar a reposição ou a próxima compra do cliente.</p>
              </div>

              <div className={tab === "servicos" ? "grid gap-3" : "hidden"}>
                <p className="text-sm text-ink-soft">Serviços que consomem este produto automaticamente.</p>
                {linked.map((row, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px]">
                    <SearchSelect
                      name="linkedServiceId"
                      placeholder="Buscar serviço..."
                      value={row.serviceId}
                      onChange={(serviceId) =>
                        setLinked((rows) => rows.map((item, i) => (i === index ? { ...item, serviceId } : item)))
                      }
                      emptyOption={{ value: "", label: "Selecionar serviço" }}
                      options={services.map((s) => ({ value: s.id, label: s.name }))}
                    />
                    <Input
                      name="linkedQty"
                      type="number"
                      min={0.1}
                      step="0.1"
                      value={row.quantity}
                      onChange={(e) =>
                        setLinked((rows) =>
                          rows.map((item, i) => (i === index ? { ...item, quantity: Number(e.target.value) || 0 } : item)),
                        )
                      }
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setLinked((rows) => [...rows, { serviceId: "", quantity: 1 }])}>
                  Adicionar serviço
                </Button>
              </div>

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function PrefixedInput({
  prefix,
  info,
  className,
  ...props
}: {
  prefix: string;
  info?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-soft">{prefix}</span>
      <Input className={cn("pl-10", info ? "pr-9" : undefined, className)} {...props} />
      {info ? (
        <span title={info} className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft">
          <Info size={14} aria-label={info} />
        </span>
      ) : null}
    </div>
  );
}

function SuffixedInput({
  suffix,
  info,
  className,
  ...props
}: {
  suffix: string;
  info?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Input className={cn("pr-24", className)} {...props} />
      <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-sm text-ink-soft">
        {info ? (
          <span title={info}>
            <Info size={14} aria-label={info} />
          </span>
        ) : null}
        <span>{suffix}</span>
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-blue-600" : "bg-slate-300")}
      >
        <span className={cn("absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white transition", checked ? "translate-x-5" : "translate-x-0")} />
      </button>
    </div>
  );
}
