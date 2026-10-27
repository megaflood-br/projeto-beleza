"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";
import { saveSupplierProfile } from "@/app/actions/supplier-catalog";

export function SupplierCompanyForm({
  company,
}: {
  company: { name: string; phone: string | null; email: string | null; city: string | null; address: string | null };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setPending(true);
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
        <p className="mt-1 text-sm text-ink-soft">Dados que os salões veem no catálogo.</p>
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
          <Field label="Cidade">
            <Input name="city" defaultValue={company.city ?? ""} />
          </Field>
          <Field label="Endereço">
            <Input name="address" defaultValue={company.address ?? ""} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
        </form>
      </Card>
    </div>
  );
}
