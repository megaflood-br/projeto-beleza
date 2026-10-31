"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { savePartnerBrand } from "@/app/actions/partner-brand";
import { Button, Card, Field, Input } from "@/components/ui";
import { readBrandLogo } from "@/lib/product-photo";
import { SYSTEM_PRIMARY } from "@/lib/branding";

export function PartnerAppearanceBoard({
  name,
  logoUrl,
  faviconUrl,
  primary,
  secondary,
}: {
  name: string;
  logoUrl: string;
  faviconUrl: string;
  primary: string;
  secondary: string;
}) {
  const router = useRouter();
  const logoRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const [brandName, setBrandName] = useState(name);
  const [url, setUrl] = useState(logoUrl || "");
  const [icon, setIcon] = useState(faviconUrl || "");
  const [color, setColor] = useState(primary || SYSTEM_PRIMARY);
  const [second, setSecond] = useState(secondary || "#0f172a");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("name", brandName);
    formData.set("logoUrl", url);
    formData.set("faviconUrl", icon);
    formData.set("primary", color);
    formData.set("secondary", second);
    const result = await savePartnerBrand(formData);
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-3xl">Marca do sistema</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Isto troca o logo e as cores do CRM para os salões que você indicar. A logo da empresa de cada salão continua nas configurações deles.
        </p>
      </div>
      <Card>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <Field label="Nome da marca">
            <Input value={brandName} onChange={(event) => setBrandName(event.target.value)} required />
          </Field>
          <Field label="Logo do sistema">
            <div className="flex flex-wrap items-center gap-4">
              {url ? (
                <img src={url} alt="" className="h-16 w-auto max-w-[18rem] object-contain" />
              ) : (
                <ImageIcon size={22} className="text-slate-400" />
              )}
              <div className="space-y-2">
                <input
                  ref={logoRef}
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
                <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => logoRef.current?.click()}>
                  {url ? "Trocar logo" : "Enviar logo"}
                </Button>
                <p className="text-xs text-ink-soft">PNG transparente. Este é o logo do sistema, não o do salão.</p>
              </div>
            </div>
          </Field>
          <Field label="Favicon">
            <div className="flex flex-wrap items-center gap-4">
              {icon ? <img src={icon} alt="" className="h-10 w-10 object-contain" /> : <ImageIcon size={18} className="text-slate-400" />}
              <input
                ref={iconRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void readBrandLogo(file)
                    .then((next) => setIcon(next))
                    .catch((err: Error) => setError(err.message));
                }}
              />
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => iconRef.current?.click()}>
                Enviar favicon
              </Button>
            </div>
          </Field>
          <Field label="Cores">
            <div className="flex flex-wrap gap-4">
              <label className="grid gap-1 text-xs text-ink-soft">
                Primária
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-paper p-1" />
              </label>
              <label className="grid gap-1 text-xs text-ink-soft">
                Secundária
                <input type="color" value={second} onChange={(event) => setSecond(event.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-paper p-1" />
              </label>
            </div>
          </Field>
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">Prévia</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center px-3 py-3" style={{ background: second }}>
                {url ? <img src={url} alt="" className="h-12 w-auto max-w-[16rem] object-contain" /> : <span className="text-sm text-white">{brandName}</span>}
              </div>
              <span className="inline-flex rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: color }}>
                Botão primário
              </span>
            </div>
          </div>
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button disabled={busy}>{busy ? "Salvando..." : "Salvar marca do sistema"}</Button>
        </form>
      </Card>
    </div>
  );
}
