"use client";

import { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { savePlatformBrand } from "@/app/actions/platform-brand";
import { Button, Card, Field, Input } from "@/components/ui";
import { readBrandLogo } from "@/lib/product-photo";
import { SYSTEM_LOGO, SYSTEM_PRIMARY } from "@/lib/branding";
import { useRouter } from "next/navigation";

export function AppearanceBoard({
  logoUrl,
  primary,
}: {
  logoUrl: string;
  primary: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(logoUrl || SYSTEM_LOGO);
  const [color, setColor] = useState(primary || SYSTEM_PRIMARY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave(formData: FormData) {
    setBusy(true);
    setError(null);
    formData.set("logoUrl", url);
    formData.set("accentColor", color);
    await savePlatformBrand(formData);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Aparência</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Logo e cor primária do MegaBeauty. Vale para login, menu e botões do sistema. A identidade de cada salão continua nas configurações da empresa.
        </p>
      </div>

      <Card>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(new FormData(event.currentTarget));
          }}
        >
          <Field label="Logo do sistema">
            <input type="hidden" name="logoUrl" value={url} />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-52 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                {url ? (
                  <img src={url} alt="Logo MegaBeauty" className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <ImageIcon size={22} className="text-slate-400" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void readBrandLogo(file)
                      .then((next) => {
                        setError(null);
                        setUrl(next);
                      })
                      .catch((err: Error) => setError(err.message));
                  }}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => fileRef.current?.click()}>
                    {url ? "Trocar logo" : "Enviar logo"}
                  </Button>
                  {url && url !== SYSTEM_LOGO ? (
                    <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setUrl(SYSTEM_LOGO)}>
                      Logo padrão
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-ink-soft">PNG com fundo claro fica melhor. Aparece no login, na home e no menu.</p>
              </div>
            </div>
          </Field>

          <Field label="Cor primária">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-paper p-1"
                aria-label="Cor primária"
              />
              <Input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="max-w-40 font-mono uppercase"
              />
              <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setColor(SYSTEM_PRIMARY)}>
                Restaurar #FF0447
              </Button>
            </div>
            <p className="text-xs text-ink-soft">Botões, links, item ativo do menu e destaques do layout.</p>
          </Field>

          <div className="rounded-xl border border-line bg-sand/60 p-4">
            <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">Prévia</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="rounded-md bg-slate-950 px-3 py-2">
                {url ? <img src={url} alt="" className="h-8 w-auto max-w-[10rem] rounded bg-white object-contain p-1" /> : null}
              </div>
              <span className="inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: color }}>
                Botão primário
              </span>
              <span className="text-sm font-medium" style={{ color }}>
                Link de exemplo
              </span>
            </div>
          </div>

          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : "Salvar aparência"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
