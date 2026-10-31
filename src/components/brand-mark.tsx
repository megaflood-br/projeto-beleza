"use client";

import { cn } from "@/lib/utils";
import { useBrand } from "@/components/branding-provider";
import { SYSTEM_LOGO, SYSTEM_LOGO_DARK } from "@/lib/branding";

export function BrandMark({
  className,
  imgClassName,
  onDark = false,
}: {
  className?: string;
  imgClassName?: string;
  onDark?: boolean;
}) {
  const { logoUrl, name } = useBrand();
  const src = onDark && (!logoUrl || logoUrl === SYSTEM_LOGO) ? SYSTEM_LOGO_DARK : logoUrl;
  return (
    <img
      src={src}
      alt={name || "MegaBeauty"}
      className={cn("h-12 w-auto max-w-[16rem] object-contain object-left", className, imgClassName)}
    />
  );
}
