import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export function uploadRoot() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  const url = process.env.DATABASE_URL ?? "";
  const file = url.startsWith("file:") ? url.slice("file:".length) : "";
  if (file.includes("/data/")) return path.join(path.dirname(path.resolve(file)), "uploads");
  return path.join(process.cwd(), "data", "uploads");
}

function extFromMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

async function removeOwned(url?: string | null) {
  if (!url?.startsWith("/uploads/")) return;
  const relative = url.replace(/^\/uploads\//, "");
  const file = path.join(uploadRoot(), ...relative.split("/").filter(Boolean));
  if (!file.startsWith(uploadRoot())) return;
  try {
    await unlink(file);
  } catch {
    // already gone
  }
}

export async function saveTenantLogo(tenantId: string, raw: string | null, previous?: string | null) {
  if (!raw) {
    await removeOwned(previous);
    return null;
  }
  if (raw.startsWith("/uploads/") || raw.startsWith("/branding/")) return raw;
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return previous ?? null;
  const dir = path.join(uploadRoot(), "logo", tenantId);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(8).toString("hex")}.${extFromMime(match[1])}`;
  await writeFile(path.join(dir, name), Buffer.from(match[2], "base64"));
  if (previous && previous !== raw) await removeOwned(previous);
  return `/uploads/logo/${tenantId}/${name}`;
}

export async function uploadToDataUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (!url.startsWith("/uploads/")) return url;
  const relative = url.replace(/^\/uploads\//, "");
  const file = path.join(uploadRoot(), ...relative.split("/").filter(Boolean));
  if (!file.startsWith(uploadRoot())) return "";
  try {
    const data = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return "";
  }
}

export async function saveSupplierProductPhoto(tenantId: string, raw: string | null, previous?: string | null) {
  if (!raw) {
    await removeOwned(previous);
    return null;
  }
  if (raw.startsWith("/uploads/")) return raw;
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return previous ?? null;
  const dir = path.join(uploadRoot(), "supplier", tenantId);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(8).toString("hex")}.${extFromMime(match[1])}`;
  await writeFile(path.join(dir, name), Buffer.from(match[2], "base64"));
  if (previous && previous !== raw) await removeOwned(previous);
  return `/uploads/supplier/${tenantId}/${name}`;
}
