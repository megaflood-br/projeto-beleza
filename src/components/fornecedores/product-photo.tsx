import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductPhoto({
  src,
  alt,
  className,
  iconSize = 36,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}) {
  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-white", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <Package size={iconSize} className="text-slate-300" aria-hidden />
      )}
    </div>
  );
}
