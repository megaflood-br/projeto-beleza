"use client";

import { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { readProductPhoto } from "@/lib/product-photo";

export function SalonLogoField({ defaultUrl }: { defaultUrl: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl);
  const [error, setError] = useState<string | null>(null);

  return (
    <Field label="Logo da empresa">
      <input type="hidden" name="logoUrl" value={url} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-36 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
          {url ? (
            <img src={url} alt="Logo do salão" className="max-h-full max-w-full object-contain p-2" />
          ) : (
            <ImageIcon size={22} className="text-slate-400" />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void readProductPhoto(file)
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
            {url ? (
              <Button type="button" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setUrl("")}>
                Remover
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-ink-soft">Aparece no cabeçalho dos POPs impressos e no QR.</p>
          {error ? <p className="text-xs text-warn">{error}</p> : null}
        </div>
      </div>
    </Field>
  );
}
