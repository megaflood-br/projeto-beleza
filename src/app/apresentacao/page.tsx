import type { Metadata } from "next";
import { PitchHub } from "@/components/pitch/pitch-deck";

export const metadata: Metadata = {
  title: "Apresentações MegaBeauty",
  description: "Três apresentações: salão, fornecedor de produtos e influenciador parceiro.",
};

export default function PitchHubPage() {
  return <PitchHub />;
}
