"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";
import { saveSupplierProfile } from "@/app/actions/supplier-catalog";
import { CityMultiSelect, CitySearch } from "@/components/fornecedor/city-picker";
import { formatBRL } from "@/lib/money";
import { SUPPLIER_PAY_METHODS, SUPPLIER_PAY_METHOD_LABEL } from "@/lib/supplier-market";

export function SupplierCompanyForm({
  company,
}: {
  company: {
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    address: string | null;
    deliveryMinCents: number;
    deliveryFeeCents: number;
    payMethods: string[];
    servedCities: string[];
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [methods, setMethods] = useState(company.payMethods);
  const [city, setCity] = useState(company.city ?? "");
  const [servedCities, setServedCities] = useState(company.servedCities);

  function toggle(method: string, on: boolean) {
    setMethods((list) => {
      const next = on ? [...new Set([...list, method])] : list.filter((item) => item !== method);
      return next.length ? next : list;
    });
  }

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
    for (const method of methods) formData.append("payMethod", method);
    formData.set("city", city);
    for (const item of servedCities) formData.append("servedCity", item);
    try {
      const result = await saveSupplierProfile(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Empresa</h1>
        <p className="mt-1 text-sm text-ink-soft">Endereço, cidades que você atende e formas aceitas no ato.</p>
      </div>
      <Card>
        <form action={submit} className="grid gap-3">
          <Field label="Nome" required>
            <Input name="name" required defaultValue={company.name} />
          </Field>
          <Field label="Telefone">
            <Input name="phone" defaultValue={company.phone ?? ""} />
          </Field>
          <Field label="E-mail">
            <Input name="email" type="email" defaultValue={company.email ?? ""} />
          </Field>
          <Field label="Cidade da empresa">
            <CitySearch value={city} onChange={setCity} placeholder="Buscar cidade da sede" />
          </Field>
          <Field label="Área atendida" required>
            <CityMultiSelect values={servedCities} onChange={setServedCities} />
          </Field>
          <Field label="Endereço de retirada">
            <Input name="address" defaultValue={company.address ?? ""} placeholder="O salão apresenta a nota neste endereço" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mínimo para entrega">
              <Input name="deliveryMin" defaultValue={company.deliveryMinCents ? formatBRL(company.deliveryMinCents).replace("R$", "").trim() : ""} placeholder="R$ 0,00" />
            </Field>
            <Field label="Taxa de entrega">
              <Input name="deliveryFee" defaultValue={company.deliveryFeeCents ? formatBRL(company.deliveryFeeCents).replace("R$", "").trim() : ""} placeholder="R$ 0,00" />
            </Field>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-ink-soft">Formas aceitas na entrega ou retirada</div>
            <div className="grid gap-2">
              {SUPPLIER_PAY_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={methods.includes(method)}
                    onChange={(e) => toggle(method, e.target.checked)}
                    className="accent-blue-600"
                  />
                  {SUPPLIER_PAY_METHOD_LABEL[method]}
                </label>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
        </form>
      </Card>
    </div>
  );
}
