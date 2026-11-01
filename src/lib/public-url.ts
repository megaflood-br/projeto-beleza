const DEFAULT_APP_ORIGIN = "https://beauty.megaflood.cloud";

const CANONICAL_HOSTS: Record<string, string> = {
  "beauty.megaflood.app": "beauty.megaflood.cloud",
  "www.beauty.megaflood.app": "beauty.megaflood.cloud",
  "www.beauty.megaflood.cloud": "beauty.megaflood.cloud",
};

export function publicAppOrigin(url?: string | null, fallback = true) {
  const raw = (url || (fallback ? process.env.APP_URL || DEFAULT_APP_ORIGIN : "")).trim();
  if (!raw) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = CANONICAL_HOSTS[parsed.hostname.toLowerCase()];
    if (host) parsed.hostname = host;
    return parsed.origin;
  } catch {
    return raw.replace(/\/$/, "").replace(/\/api\/.*$/i, "");
  }
}
