import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PitchDeckView } from "@/components/pitch/pitch-deck";
import { getPitchDeck, pitchDeckSlugs } from "@/lib/pitch-decks";

export function generateStaticParams() {
  return pitchDeckSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const deck = getPitchDeck((await params).slug);
  if (!deck) return { title: "Apresentação MegaBeauty" };
  return {
    title: `${deck.audience} · Apresentação MegaBeauty`,
    description: deck.summary,
  };
}

export default async function PitchDeckPage({ params }: { params: Promise<{ slug: string }> }) {
  const deck = getPitchDeck((await params).slug);
  if (!deck) notFound();
  return <PitchDeckView deck={deck} />;
}
