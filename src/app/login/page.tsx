"use client";

import { useState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark onDark imgClassName="h-16 max-w-[22rem]" />
        <div>
          <h1 className="font-display text-5xl leading-tight">O sistema do seu salão, do horário ao caixa.</h1>
          <p className="mt-4 max-w-md text-slate-300">
            Agenda, comandas, comissões, estoque e WhatsApp no mesmo lugar — feito para donos de salão, não para planilha.
          </p>
        </div>
        <p className="text-sm text-slate-400">Ainda não é cliente? Abra sua conta e comece hoje.</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center bg-cream p-6 pt-[max(2rem,env(safe-area-inset-top))] lg:min-h-0 lg:p-8">
        <form
          className="w-full max-w-sm space-y-4"

          action={async (formData) => {
            const result = await loginAction(formData);
            if (result?.error) setError(result.error);
          }}
        >
          <div className="lg:hidden">
            <BrandMark imgClassName="h-12 max-w-[16rem]" />
          </div>
          <h2 className="font-display text-3xl">Entrar</h2>
          <Field label="E-mail">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Senha">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button className="w-full">Acessar painel</Button>
          <p className="text-sm text-ink-soft">
            Novo salão?{" "}
            <Link href="/cadastro" className="font-medium text-wine">
              Criar conta
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
