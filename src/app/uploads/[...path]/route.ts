import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { uploadRoot } from "@/lib/product-upload";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path.filter((part) => part && !part.includes("..") && !part.includes("/") && !part.includes("\\"));
  if (!parts.length) return new NextResponse("Not found", { status: 404 });
  const root = path.resolve(uploadRoot());
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(`${root}${path.sep}`)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new NextResponse(data, {
      headers: {
        "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
