"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, User, X } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { upsertProfessional } from "@/app/actions/team";
import { cn, initials } from "@/lib/utils";
import type { ProfessionalFormValue } from "@/components/equipe/types";

const TABS = [
  { id: "cadastro", label: "Cadastro" },
  { id: "endereco", label: "Endereço" },
  { id: "usuario", label: "Usuário" },
  { id: "assinatura", label: "Assinatura digital", disabled: true },
  { id: "expediente", label: "Expediente" },
  { id: "servicos", label: "Personalizar serviços" },
  { id: "comissoes", label: "Configurar comissões", badge: "novo" },
  { id: "auxiliares", label: "Comissões e Auxiliares", disabled: true },
  { id: "pagar", label: "Pagar salário/comissão", disabled: true },
  { id: "vales", label: "Vales e Bonificações", disabled: true },
  { id: "permissoes", label: "Permissões", badge: "novo", disabled: true },
  { id: "banco", label: "Contas de banco", disabled: true },
] as const;

export function ProfessionalDrawer({
  open,
  professional,
  services,
  onClose,
}: {
  open: boolean;
  professional: ProfessionalFormValue | null;
  services: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("cadastro");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState(professional?.imageUrl ?? "");
  const [name, setName] = useState(professional?.name ?? "");
  const [color, setColor] = useState(professional?.color ?? "#2563EB");
  const [serviceIds, setServiceIds] = useState<string[]>(professional?.serviceIds ?? []);
  const [active, setActive] = useState(professional?.active ?? true);
  const [onlineBooking, setOnlineBooking] = useState(professional?.onlineBooking ?? true);
  const [generateAgenda, setGenerateAgenda] = useState(professional?.generateAgenda ?? true);
  const [receivesCommission, setReceivesCommission] = useState(professional?.receivesCommission ?? true);
  const [isStockist, setIsStockist] = useState(professional?.isStockist ?? false);
  const [salonPartner, setSalonPartner] = useState(professional?.salonPartner ?? false);

  if (!open) return null;

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("imageUrl", imageUrl);
    formData.set("color", color);
    formData.set("active", active ? "1" : "0");
    formData.set("onlineBooking", onlineBooking ? "1" : "0");
    formData.set("generateAgenda", generateAgenda ? "1" : "0");
    formData.set("receivesCommission", receivesCommission ? "1" : "0");
    formData.set("isStockist", isStockist ? "1" : "0");
    formData.set("salonPartner", salonPartner ? "1" : "0");
    formData.delete("serviceId");
    for (const serviceId of serviceIds) formData.append("serviceId", serviceId);
    try {
      const result = await upsertProfessional(formData);
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
          <h2 className="text-lg font-semibold">{professional ? "Editar profissional" : "Novo profissional"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-soft hover:bg-sand" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <form action={handleAction} className="flex min-h-0 flex-1 flex-col">
          {professional ? <input type="hidden" name="id" value={professional.id} /> : null}
          <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_1fr]">
            <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-3 lg:block lg:overflow-y-auto lg:border-r lg:border-b-0">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={"disabled" in item && item.disabled}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex w-full shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap lg:rounded-none lg:border-l-2",
                    "disabled" in item && item.disabled
                      ? "cursor-not-allowed border-transparent text-slate-400"
                      : tab === item.id
                        ? "border-blue-600 bg-blue-50 font-medium text-blue-600 lg:bg-transparent"
                        : "border-transparent text-slate-600 hover:bg-sand",
                  )}
                >
                  <span>{item.label}</span>
                  {"badge" in item && item.badge ? (
                    <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold text-blue-700">{item.badge}</span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              <div className={tab === "cadastro" ? "grid gap-4" : "hidden"}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-line text-lg font-semibold"
                    style={{ background: imageUrl ? undefined : name ? color : "#f1f5f9" }}
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
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
                    <Input className="pl-9" name="name" required placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Apelido">
                    <Input name="nickname" placeholder="Como aparece na agenda" defaultValue={professional?.nickname ?? ""} />
                  </Field>
                  <Field label="Celular" required>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-soft">🇧🇷 +55</span>
                      <Input className="pl-[4.75rem]" name="phone" required placeholder="(11) 99999-0000" defaultValue={professional?.phone ?? ""} />
                    </div>
                  </Field>
                  <Field label="Profissão">
                    <Input name="specialty" placeholder="Cabelo, estética..." defaultValue={professional?.specialty ?? ""} />
                  </Field>
                  <Field label="Aniversário">
                    <Input name="birthDate" type="date" defaultValue={professional?.birthDate ?? ""} />
                  </Field>
                  <Field label="CPF/CNPJ">
                    <Input name="document" placeholder="000.000.000-00" defaultValue={professional?.document ?? ""} />
                  </Field>
                  <Field label="RG">
                    <Input name="rg" defaultValue={professional?.rg ?? ""} />
                  </Field>
                </div>
                <Field label="Anotações">
                  <Textarea name="notes" placeholder="Observações internas" defaultValue={professional?.notes ?? ""} className="min-h-24" />
                </Field>

                <div className="pt-2">
                  <div className="mb-3 text-sm font-semibold">Configurações</div>
                  <div className="grid gap-2">
                    <ToggleRow
                      label="Ativo"
                      hint="Um profissional desativado não será listado para realizar agendamentos, comandas etc."
                      checked={active}
                      onChange={setActive}
                    />
                    <ToggleRow
                      label="Disponível para agendamento online"
                      hint="Clientes podem escolher esse profissional para fazer agendamentos online."
                      checked={onlineBooking}
                      onChange={setOnlineBooking}
                    />
                    <ToggleRow
                      label="Gerar agenda"
                      hint="Caso esteja desativado não será gerada agenda para este profissional."
                      checked={generateAgenda}
                      onChange={setGenerateAgenda}
                    />
                    <ToggleRow
                      label="Recebe comissão"
                      hint="Desmarque se o profissional não recebe comissão."
                      checked={receivesCommission}
                      onChange={setReceivesCommission}
                    />
                    <ToggleRow
                      label="É estoquista"
                      hint="Marque para o profissional receber as notificações de solicitação de produtos."
                      badge="novo"
                      checked={isStockist}
                      onChange={setIsStockist}
                    />
                    <ToggleRow
                      label="Contratado pela Lei do Salão Parceiro"
                      hint="Marque caso este profissional seja um parceiro contratado pela lei."
                      checked={salonPartner}
                      onChange={setSalonPartner}
                    />
                  </div>
                </div>
              </div>

              <div className={tab === "endereco" ? "grid gap-3 md:grid-cols-2" : "hidden"}>
                <Field label="CEP">
                  <Input name="zip" placeholder="00000-000" defaultValue={professional?.zip ?? ""} />
                </Field>
                <Field label="Estado">
                  <Input name="state" placeholder="SP" defaultValue={professional?.state ?? ""} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Endereço">
                    <Input name="address" placeholder="Rua, avenida..." defaultValue={professional?.address ?? ""} />
                  </Field>
                </div>
                <Field label="Número">
                  <Input name="addressNumber" defaultValue={professional?.addressNumber ?? ""} />
                </Field>
                <Field label="Complemento">
                  <Input name="complement" defaultValue={professional?.complement ?? ""} />
                </Field>
                <Field label="Bairro">
                  <Input name="district" defaultValue={professional?.district ?? ""} />
                </Field>
                <Field label="Cidade">
                  <Input name="city" defaultValue={professional?.city ?? ""} />
                </Field>
              </div>

              <div className={tab === "usuario" ? "grid gap-3" : "hidden"}>
                <p className="text-sm text-ink-soft">Acesso ao painel MegaBeauty para este profissional.</p>
                <Field label="E-mail">
                  <Input
                    name="userEmail"
                    type="email"
                    placeholder="grace.l@example.com"
                    defaultValue={professional?.user?.email ?? ""}
                  />
                </Field>
                <Field label="Perfil">
                  <Select name="userRole" defaultValue={professional?.user?.role ?? "PROFESSIONAL"}>
                    <option value="MANAGER">Gerente</option>
                    <option value="RECEPTIONIST">Recepção</option>
                    <option value="PROFESSIONAL">Profissional</option>
                  </Select>
                </Field>
                {professional?.user ? (
                  <p className="text-sm text-ink-soft">Este profissional já tem acesso. A senha não é alterada aqui.</p>
                ) : (
                  <Field label="Senha inicial">
                    <Input name="userPassword" placeholder="demo1234" defaultValue="demo1234" />
                  </Field>
                )}
              </div>

              <div className={tab === "expediente" ? "grid gap-3 md:grid-cols-2" : "hidden"}>
                <Field label="Início">
                  <Input name="workStart" type="time" defaultValue={professional?.workStart ?? "09:00"} />
                </Field>
                <Field label="Fim">
                  <Input name="workEnd" type="time" defaultValue={professional?.workEnd ?? "19:00"} />
                </Field>
                <Field label="Cor na agenda">
                  <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </Field>
              </div>

              <div className={tab === "servicos" ? "grid gap-2" : "hidden"}>
                <p className="mb-1 text-sm text-ink-soft">Serviços que este profissional realiza.</p>
                {services.map((service) => (
                  <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(service.id)}
                      onChange={(e) =>
                        setServiceIds((ids) =>
                          e.target.checked ? [...ids, service.id] : ids.filter((id) => id !== service.id),
                        )
                      }
                      className="accent-blue-600"
                    />
                    {service.name}
                  </label>
                ))}
              </div>

              <div className={tab === "comissoes" ? "grid max-w-sm gap-3" : "hidden"}>
                <Field label="Comissão padrão (%)">
                  <Input name="commissionPct" type="number" min={0} max={100} defaultValue={professional?.commissionPct ?? 40} />
                </Field>
                <p className="text-sm text-ink-soft">Usada quando o serviço não tem comissão própria. Só vale se “Recebe comissão” estiver ativo.</p>
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
  badge,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  badge?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line px-4 py-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          {label}
          {badge ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{badge}</span> : null}
        </div>
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
