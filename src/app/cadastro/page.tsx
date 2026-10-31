"use client";

import { useState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { useBrand } from "@/components/branding-provider";
import { Button, Field, Input } from "@/components/ui";

export default function CadastroPage() {
  const [error, setError] = useState<string | null>(null);
  const { name } = useBrand();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6 pt-[max(2rem,env(safe-area-inset-top))] sm:p-8">
      <BrandMark imgClassName="h-12 max-w-[16rem]" />
      <h1 className="mt-6 font-display text-3xl sm:text-4xl">Abra seu salão no {name}</h1>
      <p className="mt-2 text-ink-soft">Crie sua conta e organize agenda, clientes e caixa em poucos minutos.</p>
      <form
        className="mt-8 grid gap-3"
        action={async (formData) => {
          const result = await registerAction(formData);
          if (result?.error) setError(result.error);
        }}
      >
        <Field label="Seu nome">
          <Input name="name" required />
        </Field>
        <Field label="Nome do salão">
          <Input name="salon" required />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" minLength={6} required />
        </Field>
        {error ? <p className="text-sm text-warn">{error}</p> : null}
        <Button>Criar minha conta</Button>
      </form>
      <Link href="/login" className="mt-4 text-sm font-medium text-wine">
        Já tenho conta
      </Link>
    </main>
  );
}
