"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { savePlatformLanding } from "@/app/actions/platform-brand";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { readBrandLogo } from "@/lib/product-photo";
import type { PartnerLandingFeature } from "@/lib/partners";

export function PlatformLandingBoard({
  kicker,
  headline,
  text,
  cta,
  imageUrl,
  features,
}: {
  kicker: string;
  headline: string;
  text: string;
  cta: string;
  imageUrl: string;
  features: PartnerLandingFeature[];
}) {
  const router = useRouter();
  const imageRef = useRef<HTMLInputElement>(null);
  const padded = [0, 1, 2, 3, 4, 5].map((index) => features[index] ?? { title: "", text: "" });
  const [copy, setCopy] = useState({ kicker, headline, text, cta });
  const [image, setImage] = useState(imageUrl || "");
  const [cards, setCards] = useState(padded);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("kicker", copy.kicker);
    formData.set("headline", copy.headline);
    formData.set("text", copy.text);
    formData.set("cta", copy.cta);
    formData.set("imageUrl", image);
    cards.forEach((card, index) => {
      formData.set(`featureTitle${index + 1}`, card.title);
      formData.set(`featureText${index + 1}`, card.text);
    });
    const result = await savePlatformLanding(formData);
    setBusy(false);
    if (result && "error" in result && typeof (result as { error?: unknown }).error === "string") {
      setError((result as { error: string }).error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="font-display text-2xl">Landing page</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Título, capa e destaques da home. O catálogo completo das funcionalidades do sistema já aparece na landing.
        </p>
        <a href="/" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-wine">
          Abrir a home
        </a>
      </div>
      <Card>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <Field label="Olho (linha pequena)">
            <Input value={copy.kicker} onChange={(event) => setCopy({ ...copy, kicker: event.target.value })} />
          </Field>
          <Field label="Título">
            <Input value={copy.headline} onChange={(event) => setCopy({ ...copy, headline: event.target.value })} />
          </Field>
          <Field label="Texto">
            <Textarea value={copy.text} onChange={(event) => setCopy({ ...copy, text: event.target.value })} rows={4} />
          </Field>
          <Field label="Texto do botão">
            <Input value={copy.cta} onChange={(event) => setCopy({ ...copy, cta: event.target.value })} />
          </Field>
          <Field label="Imagem de capa">
            <div className="flex flex-wrap items-center gap-4">
              {image ? (
                <img src={image} alt="" className="h-20 w-auto max-w-[16rem] rounded-lg object-cover" />
              ) : (
                <ImageIcon size={22} className="text-slate-400" />
              )}
              <input
                ref={imageRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void readBrandLogo(file)
                    .then((next) => {
                      setError(null);
                      setImage(next);
                    })
                    .catch((err: Error) => setError(err.message));
                }}
              />
              <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => imageRef.current?.click()}>
                {image ? "Trocar imagem" : "Enviar imagem"}
              </Button>
            </div>
          </Field>
          {cards.map((card, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-line p-3">
              <Field label={`Bloco ${index + 1} — título`}>
                <Input
                  value={card.title}
                  onChange={(event) => {
                    const next = [...cards];
                    next[index] = { ...card, title: event.target.value };
                    setCards(next);
                  }}
                />
              </Field>
              <Field label="Texto">
                <Textarea
                  rows={2}
                  value={card.text}
                  onChange={(event) => {
                    const next = [...cards];
                    next[index] = { ...card, text: event.target.value };
                    setCards(next);
                  }}
                />
              </Field>
            </div>
          ))}
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          <Button disabled={busy}>{busy ? "Salvando..." : "Salvar landing"}</Button>
        </form>
      </Card>
    </div>
  );
}
