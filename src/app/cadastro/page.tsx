"use client";

import { useState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export default function CadastroPage() {
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="font-display text-4xl">Abra seu salão no MegaBeauty</h1>
      <p className="mt-2 text-ink-soft">Cada conta vira um tenant isolado, com agenda e CRM próprios.</p>
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
        <Button>Criar workspace</Button>
      </form>
      <Link href="/login" className="mt-4 text-sm font-medium text-wine">
        Já tenho conta
      </Link>
    </main>
  );
}
