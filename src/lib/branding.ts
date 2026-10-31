export const SYSTEM_PRIMARY = "#ff0447";
export const SYSTEM_LOGO = "/branding/logo.png";
export const SYSTEM_LOGO_DARK = "/branding/logo-dark.png";
export const SYSTEM_BRAND_NAME = "MegaBeauty";
export const LEGACY_PRIMARY = "#2563eb";

export type SystemBrand = {
  logoUrl: string;
  primary: string;
  wine: string;
  wineDeep: string;
  goldSoft: string;
  name: string;
  faviconUrl: string | null;
  secondary: string;
  partnerSlug: string | null;
};

export function parseHexColor(value: string | null | undefined, fallback = SYSTEM_PRIMARY) {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.slice(1).toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.slice(1).toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function hexToRgb(hex: string) {
  const value = parseInt(parseHexColor(hex).slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, "0")).join("")}`;
}

export function mixHex(from: string, to: string, amount: number) {
  const t = Math.max(0, Math.min(1, amount));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

export function resolveSystemPrimary(value?: string | null) {
  const parsed = parseHexColor(value, SYSTEM_PRIMARY);
  return parsed === LEGACY_PRIMARY ? SYSTEM_PRIMARY : parsed;
}

export function brandTheme(primary?: string | null): SystemBrand {
  const wine = resolveSystemPrimary(primary);
  return {
    logoUrl: SYSTEM_LOGO,
    primary: wine,
    wine,
    wineDeep: mixHex(wine, "#000000", 0.22),
    goldSoft: mixHex(wine, "#ffffff", 0.86),
    name: SYSTEM_BRAND_NAME,
    faviconUrl: null,
    secondary: "#0f172a",
    partnerSlug: null,
  };
}

export function brandFromPartner(input: {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primary?: string | null;
  secondary?: string | null;
  slug?: string | null;
}): SystemBrand {
  const theme = brandTheme(input.primary);
  return {
    ...theme,
    logoUrl: input.logoUrl || SYSTEM_LOGO,
    name: input.name.trim() || SYSTEM_BRAND_NAME,
    faviconUrl: input.faviconUrl || null,
    secondary: parseHexColor(input.secondary, "#0f172a"),
    partnerSlug: input.slug ?? null,
  };
}

export function brandCssVars(brand: Pick<SystemBrand, "wine" | "wineDeep" | "goldSoft" | "secondary">) {
  return `--wine:${brand.wine};--wine-deep:${brand.wineDeep};--gold-soft:${brand.goldSoft};--brand-secondary:${brand.secondary ?? "#0f172a"};`;
}
