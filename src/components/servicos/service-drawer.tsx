"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, X } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { upsertService } from "@/app/actions/services";
import { DURATION_OPTIONS } from "@/lib/constants";
import { minutesToLabel } from "@/lib/dates";
import { cn, initials } from "@/lib/utils";
import type { ServiceFormValue } from "@/components/servicos/types";

const TABS = [
  { id: "cadastro", label: "Cadastro" },
  { id: "configuracoes", label: "Configurações" },
  { id: "cashback", label: "Cashback" },
  { id: "cuidados", label: "Cuidados" },
  { id: "retorno", label: "Retorno" },
  { id: "comissoes", label: "Comissões e Auxiliares" },
  { id: "personalizar", label: "Personalizar" },
  { id: "produtos", label: "Produtos consumidos" },
  { id: "nota", label: "Configurar nota fiscal", disabled: true },
] as const;

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ServiceDrawer({
  open,
  service,
  categories,
  products,
  onClose,
}: {
  open: boolean;
  service: ServiceFormValue | null;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("cadastro");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? "");
  const [color, setColor] = useState(service?.color ?? "#6366F1");
  const [name, setName] = useState(service?.name ?? "");
  const [active, setActive] = useState(service?.active ?? true);
  const [online, setOnline] = useState(service?.onlineBooking ?? true);
  const [favorite, setFavorite] = useState(service?.favorite ?? false);
  const [consumed, setConsumed] = useState(
    service?.products.length ? service.products : [{ productId: "", quantity: 1 }],
  );

  const durationValues = new Set(DURATION_OPTIONS);
  if (service?.durationMin) durationValues.add(service.durationMin);
  const durationOptions = [...durationValues].sort((a, b) => a - b);

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("active", active ? "1" : "0");
    formData.set("onlineBooking", online ? "1" : "0");
    formData.set("favorite", favorite ? "1" : "");
    formData.set("color", color);
    formData.set("imageUrl", imageUrl);
    try {
      const result = await upsertService(formData);
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
          <h2 className="text-lg font-semibold">{service ? "Editar serviço" : "Novo serviço"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
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
                    className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-line text-lg font-semibold text-white"
                    style={{ background: color }}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(name || "Serviço")
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
                      reader.onload = () => setImageUrl(String(reader.result ?? ""));
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    Alterar
                  </Button>
                </div>

                <Field label="Nome" required>
                  <Input name="name" required placeholder="Informe o nome" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>

                <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_1fr]">
                  <Field label="Categoria" required>
                    <SearchSelect
                      name="categoryId"
                      required
                      placeholder="Categoria"
                      defaultValue={service?.categoryId ?? ""}
                      options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </Field>
                  <Field label="Tipo de preço">
                    <SearchSelect
                      name="priceType"
                      defaultValue={service?.priceType ?? "fixed"}
                      options={[
                        { value: "fixed", label: "Preço fixo" },
                        { value: "from", label: "A partir de" },
                      ]}
                    />
                  </Field>
                  <Field label="Preço de venda">
                    <Input name="price" placeholder="R$ 0,00" defaultValue={service ? centsToInput(service.priceCents) : ""} />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Custo adicional">
                    <div className="relative">
                      <Input name="extraCost" placeholder="R$ 0,00" defaultValue={service?.extraCostCents ? centsToInput(service.extraCostCents) : ""} />
                      <Info size={14} className="absolute top-3.5 right-3 text-ink-soft" />
                    </div>
                  </Field>
                  <Field label="Comissão">
                    <div className="relative">
                      <Input name="commissionPct" placeholder="% 0,00" defaultValue={service?.commissionPct ?? ""} />
                      <Info size={14} className="absolute top-3.5 right-3 text-ink-soft" />
                    </div>
                  </Field>
                  <Field label="Duração">
                    <SearchSelect
                      name="durationMin"
                      defaultValue={String(service?.durationMin ?? 60)}
                      options={durationOptions.map((min) => ({ value: String(min), label: minutesToLabel(min) }))}
                    />
                  </Field>
                </div>

                <Field label="Descrição">
                  <Textarea
                    name="description"
                    placeholder="Essa descrição aparecerá para o seu cliente quando ele for agendar online"
                    defaultValue={service?.description ?? ""}
                    className="min-h-28"
                  />
                </Field>
              </div>

              <div className={tab === "configuracoes" ? "grid gap-4" : "hidden"}>
                <ToggleRow label="Serviço ativo" hint="Aparece na agenda e no agendamento." checked={active} onChange={setActive} />
                <ToggleRow label="Disponível no agendamento online" checked={online} onChange={setOnline} />
                <ToggleRow label="Favorito" hint="Destaca o serviço na lista." checked={favorite} onChange={setFavorite} />
              </div>

              <div className={tab === "cashback" ? "grid max-w-sm gap-3" : "hidden"}>
                <Field label="Cashback (%)">
                  <Input name="cashbackPct" placeholder="0" defaultValue={service?.cashbackPct ?? ""} />
                </Field>
                <p className="text-sm text-ink-soft">Percentual creditado ao cliente após a conclusão do serviço.</p>
              </div>

              <div className={tab === "cuidados" ? "grid gap-3" : "hidden"}>
                <Field label="Cuidados pós-atendimento">
                  <Textarea
                    name="aftercare"
                    placeholder="Orientações enviadas ao cliente depois do serviço"
                    defaultValue={service?.aftercare ?? ""}
                    className="min-h-40"
                  />
                </Field>
              </div>

              <div className={tab === "retorno" ? "grid max-w-sm gap-3" : "hidden"}>
                <Field label="Retornar após (dias)">
                  <Input name="returnAfterDays" type="number" min={0} placeholder="30" defaultValue={service?.returnAfterDays ?? ""} />
                </Field>
                <p className="text-sm text-ink-soft">Usado para lembrar o cliente de remarcar.</p>
              </div>

              <div className={tab === "comissoes" ? "grid max-w-lg gap-3" : "hidden"}>
                <p className="text-sm text-ink-soft">
                  A comissão padrão do serviço fica na aba Cadastro. Auxiliares podem ser definidos no agendamento.
                </p>
              </div>

              <div className={tab === "personalizar" ? "grid max-w-sm gap-3" : "hidden"}>
                <Field label="Cor na agenda">
                  <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </Field>
              </div>

              <div className={tab === "produtos" ? "grid gap-3" : "hidden"}>
                {consumed.map((row, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px]">
                    <SearchSelect
                      name="consumedProductId"
                      placeholder="Buscar produto..."
                      value={row.productId}
                      onChange={(productId) =>
                        setConsumed((rows) => rows.map((item, i) => (i === index ? { ...item, productId } : item)))
                      }
                      emptyOption={{ value: "", label: "Selecionar produto" }}
                      options={products.map((p) => ({ value: p.id, label: p.name }))}
                    />
                    <Input
                      name="consumedQty"
                      type="number"
                      min={0.1}
                      step="0.1"
                      value={row.quantity}
                      onChange={(e) =>
                        setConsumed((rows) =>
                          rows.map((item, i) => (i === index ? { ...item, quantity: Number(e.target.value) || 0 } : item)),
                        )
                      }
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setConsumed((rows) => [...rows, { productId: "", quantity: 1 }])}>
                  Adicionar produto
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
