"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui";
import { slugify } from "@/lib/utils";

export function DownloadQrButton({
  qr,
  title,
  code,
}: {
  qr: string;
  title: string;
  code: string;
}) {
  function download() {
    if (!qr) return;
    const image = new Image();
    image.onload = () => {
      const size = 900;
      const pad = 56;
      const caption = 110;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size + caption;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, pad, pad, size - pad * 2, size - pad * 2);
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.font = "600 28px sans-serif";
      ctx.fillText(code, size / 2, size + 8);
      ctx.font = "22px sans-serif";
      const line = title.length > 42 ? `${title.slice(0, 40).trim()}…` : title;
      ctx.fillText(line, size / 2, size + 42);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `qr-pop-${slugify(code || title) || "pop"}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = qr;
  }

  return (
    <Button type="button" variant="outline" onClick={download} disabled={!qr}>
      <Download size={16} />
      Baixar QR
    </Button>
  );
}
