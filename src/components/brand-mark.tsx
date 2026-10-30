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
  const { logoUrl } = useBrand();
  const src = onDark && (!logoUrl || logoUrl === SYSTEM_LOGO) ? SYSTEM_LOGO_DARK : logoUrl;
  return (
    <img
      src={src}
      alt="MegaBeauty"
      className={cn("h-8 w-auto max-w-[11rem] object-contain object-left", className, imgClassName)}
    />
  );
}
