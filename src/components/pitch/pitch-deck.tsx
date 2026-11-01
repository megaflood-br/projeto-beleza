"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import type { PitchDeck, PitchSlide } from "@/lib/pitch-decks";
import { listPitchDecks } from "@/lib/pitch-decks";

function SlideCopy({ slide, cta, ctaHref }: { slide: PitchSlide; cta: string; ctaHref: string }) {
  if (slide.kind === "cover" || slide.kind === "close") {
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] flex-col justify-end pb-4">
        {slide.kicker ? <p className="text-sm font-medium tracking-[0.22em] text-wine uppercase">{slide.kicker}</p> : null}
        <h1 className="mt-5 max-w-5xl font-display text-[clamp(2.2rem,6.4vw,5.6rem)] leading-[0.95] drop-shadow-sm">{slide.title}</h1>
        {slide.text ? <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-2xl">{slide.text}</p> : null}
        {slide.kind === "close" ? (
          <div className="mt-8">
            <Link href={ctaHref} className="relative z-20 inline-flex rounded-lg bg-wine px-7 py-3 text-sm font-medium text-white">
              {cta}
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (slide.kind === "statement") {
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] max-w-4xl flex-col justify-end pb-8">
        {slide.kicker ? <p className="text-sm font-medium tracking-[0.22em] text-wine uppercase">{slide.kicker}</p> : null}
        <h2 className="mt-5 font-display text-[clamp(2rem,5vw,4.2rem)] leading-[1.02]">{slide.title}</h2>
        {slide.text ? <p className="mt-6 text-lg text-white/80 sm:text-xl">{slide.text}</p> : null}
      </div>
    );
  }

  if (slide.kind === "grid") {
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] flex-col justify-end pb-2">
        {slide.kicker ? <p className="text-sm font-medium tracking-[0.22em] text-wine uppercase">{slide.kicker}</p> : null}
        <h2 className="mt-3 max-w-4xl font-display text-[clamp(1.7rem,3.6vw,3rem)] leading-[1.05]">{slide.title}</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {slide.items?.map((item) => (
            <div key={item.title} className="rounded-2xl bg-black/45 px-5 py-5 backdrop-blur-sm">
              <div className="text-lg font-medium text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.kind === "steps") {
    return (
      <div className="flex min-h-[calc(100dvh-10rem)] flex-col justify-end pb-4">
        {slide.kicker ? <p className="text-sm font-medium tracking-[0.22em] text-wine uppercase">{slide.kicker}</p> : null}
        <h2 className="mt-3 max-w-4xl font-display text-[clamp(1.7rem,3.6vw,3rem)] leading-[1.05]">{slide.title}</h2>
        <ol className="mt-8 max-w-3xl space-y-6">
          {slide.items?.map((item, index) => (
            <li key={item.title} className="grid gap-2 sm:grid-cols-[4.5rem_1fr] sm:items-start">
              <div className="font-display text-3xl text-wine">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <div className="text-xl font-medium">{item.title}</div>
                <p className="mt-1 text-white/75">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100dvh-10rem)] items-end gap-8 pb-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div>
        {slide.kicker ? <p className="text-sm font-medium tracking-[0.22em] text-wine uppercase">{slide.kicker}</p> : null}
        <h2 className="mt-3 font-display text-[clamp(1.7rem,3.8vw,3.2rem)] leading-[1.05]">{slide.title}</h2>
        {slide.text ? <p className="mt-5 max-w-xl text-lg text-white/80">{slide.text}</p> : null}
      </div>
      <div className="space-y-3">
        {slide.items?.map((item) => (
          <div key={item.title} className="rounded-2xl bg-black/45 px-5 py-4 backdrop-blur-sm">
            <div className="text-base font-medium">{item.title}</div>
            <p className="mt-1 text-sm text-white/75">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PitchDeckView({ deck }: { deck: PitchDeck }) {
  const [index, setIndex] = useState(0);
  const last = deck.slides.length - 1;
  const slide = deck.slides[index] ?? deck.slides[0];
  const others = listPitchDecks().filter((item) => item.slug !== deck.slug);

  const go = useCallback(
    (next: number) => {
      setIndex(Math.min(last, Math.max(0, next)));
    },
    [last],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        go(index + 1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === "Home") go(0);
      if (event.key === "End") go(last);
      if (event.key === "f" || event.key === "F") {
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
        else void document.exitFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, last]);

  const touchX = useRef(0);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#1a1014] text-white">
      <img key={slide.image} src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <BrandMark onDark imgClassName="h-9 max-w-[10rem] sm:h-10 sm:max-w-[13rem]" />
        <div className="flex items-center gap-3 text-xs tracking-[0.18em] text-white/70 uppercase">
          <span>{deck.audience}</span>
          <span>
            {String(index + 1).padStart(2, "0")} / {String(deck.slides.length).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="absolute top-0 left-0 z-20 h-1 bg-wine" style={{ width: `${((index + 1) / deck.slides.length) * 100}%` }} />

      <button type="button" className="absolute inset-y-0 left-0 z-10 w-[16%] cursor-w-resize" aria-label="Anterior" onClick={() => go(index - 1)} />
      <button type="button" className="absolute inset-y-0 right-0 z-10 w-[16%] cursor-e-resize" aria-label="Próximo" onClick={() => go(index + 1)} />

      <main
        className="relative z-10 mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8"
        onTouchStart={(event) => {
          touchX.current = event.changedTouches[0]?.clientX ?? 0;
        }}
        onTouchEnd={(event) => {
          const x = event.changedTouches[0]?.clientX ?? 0;
          if (touchX.current - x > 50) go(index + 1);
          if (x - touchX.current > 50) go(index - 1);
        }}
      >
        <SlideCopy slide={slide} cta={deck.cta} ctaHref={deck.ctaHref} />
      </main>

      <footer className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-white/65 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/apresentacao" className="hover:text-white">
            Todas
          </Link>
          {others.map((item) => (
            <Link key={item.slug} href={`/apresentacao/${item.slug}`} className="hover:text-white">
              {item.audience}
            </Link>
          ))}
        </div>
        <p className="hidden sm:block">Setas para avançar · F para tela cheia</p>
        <div className="flex gap-1.5">
          {deck.slides.map((item, i) => (
            <button
              key={`${item.title}-${i}`}
              type="button"
              onClick={() => go(i)}
              className={`h-1.5 rounded-full ${i === index ? "w-6 bg-wine" : "w-1.5 bg-white/40"}`}
              aria-label={`Ir para o slide ${i + 1}`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

export function PitchHub() {
  const decks = listPitchDecks();
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#1a1014] text-white">
      <img src="/apresentacao/salao-cover.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 sm:px-8">
        <BrandMark onDark imgClassName="h-10 max-w-[13rem]" />
        <div className="mt-14 max-w-3xl">
          <p className="text-sm font-medium tracking-[0.22em] text-wine uppercase">MegaBeauty · Apresentações</p>
          <h1 className="mt-5 font-display text-[clamp(2.2rem,5.6vw,4.8rem)] leading-[0.95]">Três conversas. Três portas de entrada.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Abra em tela cheia. Use as setas. Cada deck é uma reunião: dona de salão, fornecedor e influenciadora parceira.
          </p>
        </div>
        <div className="mt-12 grid flex-1 gap-4 lg:grid-cols-3">
          {decks.map((deck, index) => (
            <Link
              key={deck.slug}
              href={`/apresentacao/${deck.slug}`}
              className="group relative flex min-h-[22rem] overflow-hidden rounded-2xl"
            >
              <img src={deck.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="relative z-10 flex w-full flex-col justify-between p-7">
                <div className="font-display text-4xl text-wine">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <div className="text-sm tracking-[0.18em] text-white/70 uppercase">{deck.audience}</div>
                  <h2 className="mt-2 font-display text-3xl leading-[1.1]">{deck.label}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/80">{deck.summary}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
