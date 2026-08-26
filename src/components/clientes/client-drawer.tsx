"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ImageIcon, Info, User, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SearchSelect } from "@/components/search-select";
import { upsertClient } from "@/app/actions/clients";
import { cn, initials } from "@/lib/utils";
import type { ClientFormValue } from "@/components/clientes/types";

const TABS = [
  { id: "cadastro", label: "Cadastro" },
  { id: "painel", label: "Painel" },
  { id: "debitos", label: "Débitos" },
  { id: "creditos", label: "Créditos" },
  { id: "cashback", label: "Cashback" },
  { id: "agendamentos", label: "Agendamentos" },
  { id: "produtos", label: "Produtos", badge: "novo" },
  { id: "vendas", label: "Vendas" },
  { id: "pacotes", label: "Pacotes" },
  { id: "mensagens", label: "Mensagens" },
  { id: "anotacoes", label: "Anotações" },
  { id: "arquivos", label: "Imagens e Arquivos" },
  { id: "anamneses", label: "Anamneses" },
  { id: "assinaturas", label: "Vendas por Assinatura" },
] as const;

export function ClientDrawer({
  open,
  client,
  clients,
  tags,
  onClose,
}: {
  open: boolean;
  client: ClientFormValue | null;
  clients: { id: string; name: string }[];
  tags: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState(client?.imageUrl ?? "");
  const [name, setName] = useState(client?.name ?? "");
  const [active, setActive] = useState(client?.active ?? true);
  const [notifications, setNotifications] = useState(client?.notifications ?? true);
  const [blockAccess, setBlockAccess] = useState(client?.blockAccess ?? false);
  const [showAddress, setShowAddress] = useState(Boolean(client?.address || client?.zip));
  const [showSocial, setShowSocial] = useState(Boolean(client?.instagram || client?.facebook));

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("full", "1");
    formData.set("imageUrl", imageUrl);
    formData.set("active", active ? "1" : "0");
    formData.set("notifications", notifications ? "1" : "0");
    formData.set("blockAccess", blockAccess ? "1" : "0");
    try {
      const result = await upsertClient(formData);
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
      <aside className="relative flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{client ? "Editar cliente" : "Novo cliente"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {client ? <input type="hidden" name="id" value={client.id} /> : null}
          <div className="grid min-h-0 flex-1 lg:grid-cols-[200px_minmax(0,1fr)_260px]">
            <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-3 lg:block lg:overflow-y-auto lg:border-r lg:border-b-0">
              {TABS.map((item) => {
                const isCadastro = item.id === "cadastro";
                const disabled = !isCadastro && !client;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (!isCadastro && client) {
                        onClose();
                        router.push(`/clientes/${client.id}?tab=${item.id}`);
                      }
                    }}
                    className={cn(
                      "flex w-full shrink-0 items-center justify-between rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap lg:rounded-none lg:border-l-2",
                      disabled
                        ? "cursor-not-allowed border-transparent text-slate-400"
                        : isCadastro
                          ? "border-blue-600 bg-blue-50 font-medium text-blue-600 lg:bg-transparent"
                          : "border-transparent text-slate-600 hover:bg-sand",
                    )}
                  >
                    <span>{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-line text-lg font-semibold"
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

              <div className="mt-4 grid gap-3">
                <Field label="Nome" required>
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
                    <Input className="pl-9" name="name" required placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </Field>
                <Field label="Apelido">
                  <div className="relative">
                    <Input name="nickname" placeholder="Apelido" defaultValue={client?.nickname ?? ""} className="pr-9" />
                    <span title="Como o cliente prefere ser chamado" className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft">
                      <Info size={14} />
                    </span>
                  </div>
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Celular" required>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-soft">🇧🇷 +55</span>
                      <Input className="pl-[4.75rem]" name="phone" required placeholder="(11) 99999-0000" defaultValue={client?.phone ?? ""} />
                    </div>
                  </Field>
                  <Field label="Telefone">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-soft">🇧🇷 +55</span>
                      <Input className="pl-[4.75rem]" name="landline" placeholder="(11) 3000-0000" defaultValue={client?.landline ?? ""} />
                    </div>
                  </Field>
                </div>
                <Field label="E-mail">
                  <Input name="email" type="email" placeholder="grace.l@example.com" defaultValue={client?.email ?? ""} />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Aniversário">
                    <Input name="birthDate" type="date" defaultValue={client?.birthDate ?? ""} />
                  </Field>
                  <Field label="CNPJ">
                    <Input name="cnpj" placeholder="00.000.000/0000-00" defaultValue={client?.cnpj ?? ""} />
                  </Field>
                  <Field label="CPF">
                    <Input name="cpf" placeholder="000.000.000-00" defaultValue={client?.cpf ?? ""} />
                  </Field>
                  <Field label="RG">
                    <Input name="rg" defaultValue={client?.rg ?? ""} />
                  </Field>
                </div>
                <Field label="Dependentes">
                  <Input disabled value="Crie para editar" readOnly />
                </Field>
                <Field label="Indicado por">
                  <SearchSelect
                    name="referredById"
                    placeholder="Selecionar cliente"
                    defaultValue={client?.referredById ?? ""}
                    emptyOption={{ value: "", label: "Selecionar cliente" }}
                    options={clients.filter((c) => c.id !== client?.id).map((c) => ({ value: c.id, label: c.name }))}
                  />
                </Field>
                <Field label="Hashtags">
                  <Input name="tags" list="client-tags" placeholder="vip, coloracao" defaultValue={client?.tags ?? ""} />
                  <datalist id="client-tags">
                    {tags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Observações">
                  <Textarea name="notes" placeholder="Observações" defaultValue={client?.notes ?? ""} className="min-h-28" />
                </Field>
              </div>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>

            <aside className="min-h-0 overflow-y-auto border-t border-line px-4 py-4 lg:border-t-0 lg:border-l">
              <Accordion title="Endereço" open={showAddress} onToggle={() => setShowAddress((v) => !v)}>
                <div className="grid gap-2">
                  <Field label="CEP">
                    <Input name="zip" placeholder="00000-000" defaultValue={client?.zip ?? ""} />
                  </Field>
                  <Field label="Endereço">
                    <Input name="address" defaultValue={client?.address ?? ""} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Número">
                      <Input name="addressNumber" defaultValue={client?.addressNumber ?? ""} />
                    </Field>
                    <Field label="UF">
                      <Input name="state" placeholder="SP" defaultValue={client?.state ?? ""} />
                    </Field>
                  </div>
                  <Field label="Complemento">
                    <Input name="complement" defaultValue={client?.complement ?? ""} />
                  </Field>
                  <Field label="Bairro">
                    <Input name="district" defaultValue={client?.district ?? ""} />
                  </Field>
                  <Field label="Cidade">
                    <Input name="city" defaultValue={client?.city ?? ""} />
                  </Field>
                </div>
              </Accordion>
              <Accordion title="Redes sociais" open={showSocial} onToggle={() => setShowSocial((v) => !v)}>
                <div className="grid gap-2">
                  <Field label="Instagram">
                    <Input name="instagram" placeholder="@cliente" defaultValue={client?.instagram ?? ""} />
                  </Field>
                  <Field label="Facebook">
                    <Input name="facebook" defaultValue={client?.facebook ?? ""} />
                  </Field>
                </div>
              </Accordion>
              <div className="mt-3">
                <div className="mb-3 text-sm font-semibold">Configurações</div>
                <Field label="Desconto padrão">
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-soft">%</span>
                      <Input className="pl-8" name="defaultDiscountPct" placeholder="0,00" defaultValue={client?.defaultDiscountPct ?? 0} />
                    </div>
                    <Select name="discountTarget" defaultValue={client?.discountTarget ?? "comanda"}>
                      <option value="comanda">Na comanda</option>
                      <option value="servico">No serviço</option>
                    </Select>
                  </div>
                </Field>
                <div className="mt-3 grid gap-2">
                  <ToggleRow
                    label="Ativo"
                    hint="Um cliente desativado não será listado para agendamentos e comandas."
                    checked={active}
                    onChange={setActive}
                  />
                  <ToggleRow
                    label="Notificações"
                    hint="O cliente recebe lembretes e mensagens no WhatsApp."
                    checked={notifications}
                    onChange={setNotifications}
                  />
                  <ToggleRow
                    label="Bloquear acesso"
                    hint="Impede o agendamento online por este cliente."
                    checked={blockAccess}
                    onChange={setBlockAccess}
                  />
                </div>
              </div>
            </aside>
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

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-line pb-3">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between py-2 text-sm font-semibold">
        {title}
        <ChevronDown size={16} className={cn("text-ink-soft transition", open ? "rotate-180" : "")} />
      </button>
      <div className={open ? "block" : "hidden"}>{children}</div>
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
    <div className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
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
