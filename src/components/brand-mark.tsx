"use client";

import { cn } from "@/lib/utils";
import { useBrand } from "@/components/branding-provider";

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
  return (
    <div className={cn("inline-flex items-center", onDark && "rounded-md bg-white px-2 py-1", className)}>
      <img src={logoUrl} alt="MegaBeauty" className={cn("h-8 w-auto max-w-[11rem] object-contain object-left", imgClassName)} />
    </div>
  );
}
