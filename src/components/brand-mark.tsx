"use client";

import { cn } from "@/lib/utils";
import { useBrand } from "@/components/branding-provider";
import { brandLogoSrc } from "@/lib/branding";

export function BrandMark({
  className,
  imgClassName,
  onDark = false,
}: {
  className?: string;
  imgClassName?: string;
  onDark?: boolean;
}) {
  const brand = useBrand();
  return (
    <img
      src={brandLogoSrc(brand, onDark)}
      alt={brand.name || "MegaBeauty"}
      className={cn("h-12 w-auto max-w-[16rem] object-contain object-left", className, imgClassName)}
    />
  );
}
