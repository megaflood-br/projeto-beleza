"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useConfirm, type ConfirmOptions } from "@/components/confirm-dialog";

export function ConfirmDeleteButton({
  title,
  description,
  confirmLabel,
  className,
  ariaLabel,
  children,
  onConfirm,
}: ConfirmOptions & {
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
  onConfirm: () => void | Promise<void>;
}) {
  const confirm = useConfirm();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={async () => {
        if (!(await confirm({ title, description, confirmLabel }))) return;
        await onConfirm();
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
