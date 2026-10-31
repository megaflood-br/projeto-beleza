"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function CopyLink({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? "Copiado" : "Copiar"}
    </Button>
  );
}
