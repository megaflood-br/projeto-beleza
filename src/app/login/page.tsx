"use client";

import { useState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-[#1c1210] p-12 text-[#f7f1ea] lg:flex lg:flex-col lg:justify-between">
        <div className="font-display text-4xl">Aura</div>
        <div>
          <h1 className="font-display text-5xl leading-tight">A agenda do salão, sem planilha e sem caos.</h1>
          <p className="mt-4 max-w-md text-[#e8d7bd]">
            CRM, comissões, estoque, WhatsApp e IA no mesmo lugar — multi-tenant, em TypeScript.
          </p>
        </div>
        <p className="text-sm text-[#c4a574]">Demo: iris.p@example.org / demo1234</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <form
          className="w-full max-w-sm space-y-4"
          action={async (formData) => {
            const result = await loginAction(formData);
            if (result?.error) setError(result.error);
          }}
        >
          <h2 className="font-display text-3xl">Entrar</h2>
          <Field label="E-mail">
            <Input name="email" type="email" defaultValue="iris.p@example.org" required />
          </Field>
          <Field label="Senha">
            <Input name="password" type="password" defaultValue="demo1234" required />
          </Field>
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button className="w-full">Acessar painel</Button>
          <p className="text-sm text-ink-soft">
            Novo salão?{" "}
            <Link href="/cadastro" className="text-wine">
              Criar conta
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
