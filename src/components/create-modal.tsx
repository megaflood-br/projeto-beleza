"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui";

export function CreateModal({
  trigger,
  title,
  description,
  submitLabel = "Salvar",
  variant = "primary",
  action,
  children,
}: {
  trigger: string;
  title: string;
  description?: string;
  submitLabel?: string;
  variant?: "primary" | "success";
  action: (formData: FormData) => Promise<{ error?: string } | void | { ok?: boolean }>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && typeof result === "object" && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      // redirect() from server actions throws; let Next.js handle navigation.
      if (
        typeof err === "object" &&
        err &&
        "digest" in err &&
        String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError("Não foi possível salvar. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <Plus size={16} />
        {trigger}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description ? <p className="mt-0.5 text-sm text-ink-soft">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-ink-soft hover:bg-sand"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <form action={handleAction}>
              <div className="grid max-h-[70vh] gap-3 overflow-y-auto px-5 py-4">{children}</div>
              {error ? <p className="px-5 pb-2 text-sm text-red-600">{error}</p> : null}
              <div className="flex justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant={variant} disabled={pending}>
                  {pending ? "Salvando..." : submitLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
