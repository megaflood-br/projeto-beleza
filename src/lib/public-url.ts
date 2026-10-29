const DEFAULT_APP_ORIGIN = "https://beauty.megaflood.cloud";

export function publicAppOrigin(url?: string | null, fallback = true) {
  const raw = (url || (fallback ? process.env.APP_URL || DEFAULT_APP_ORIGIN : "")).trim();
  if (!raw) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.origin;
  } catch {
    return raw.replace(/\/$/, "").replace(/\/api\/.*$/i, "");
  }
}
