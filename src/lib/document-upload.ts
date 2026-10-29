import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { uploadRoot } from "@/lib/product-upload";

export const DOCUMENT_MAX_BYTES = 7 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function documentRoot() {
  return path.join(path.dirname(uploadRoot()), "documents");
}

export function documentMime(fileUrl: string) {
  return EXT_MIME[path.extname(fileUrl).toLowerCase()] ?? "application/octet-stream";
}

function extFromUpload(file: File) {
  const fromMime = MIME_EXT[file.type];
  if (fromMime) return fromMime;
  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (ext === "jpeg") return "jpg";
  if (ext === "pdf" || ext === "jpg" || ext === "png" || ext === "webp") return ext;
  return null;
}

export function documentDiskPath(fileUrl: string) {
  if (!fileUrl.startsWith("/documents/")) return null;
  const relative = fileUrl.replace(/^\/documents\//, "");
  const root = path.resolve(documentRoot());
  const file = path.resolve(root, ...relative.split("/").filter(Boolean));
  if (!file.startsWith(`${root}${path.sep}`)) return null;
  return file;
}

export async function saveSalonDocumentFile(tenantId: string, file: File) {
  if (!file || file.size === 0) return { error: "Selecione um arquivo PDF ou imagem." };
  if (file.size > DOCUMENT_MAX_BYTES) return { error: "Arquivo maior que 7 MB." };
  const ext = extFromUpload(file);
  if (!ext) return { error: "Envie PDF, JPG, PNG ou WEBP." };
  const dir = path.join(documentRoot(), tenantId);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/documents/${tenantId}/${name}`, fileName: file.name.replace(/[/\\]/g, " ").trim().slice(0, 180) };
}

export async function removeSalonDocumentFile(fileUrl?: string | null) {
  const file = fileUrl ? documentDiskPath(fileUrl) : null;
  if (!file) return;
  try {
    await unlink(file);
  } catch {
    /* already gone */
  }
}

export async function readSalonDocumentFile(fileUrl: string) {
  const file = documentDiskPath(fileUrl);
  if (!file) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}
