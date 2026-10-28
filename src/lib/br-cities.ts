import rawCities from "@/lib/br-cities-data.json";

type CityPair = [name: string, uf: string];

const CITIES = rawCities as CityPair[];

export function foldCity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseCityInput(raw?: string | null) {
  const text = String(raw ?? "").trim();
  if (!text) return { name: "", uf: null as string | null, label: "" };
  const match = text.match(/[,/·\-]\s*([A-Za-z]{2})\s*$/);
  const uf = match ? match[1].toUpperCase() : null;
  const name = (match ? text.slice(0, match.index) : text).replace(/\s+/g, " ").trim();
  return { name, uf, label: uf ? `${name}/${uf}` : name };
}

export function cityLabel(name: string, uf: string) {
  return `${name}/${uf}`;
}

export function resolveCityLabel(raw?: string | null) {
  const parsed = parseCityInput(raw);
  if (!parsed.name) return "";
  const hit = CITIES.find((city) => foldCity(city[0]) === foldCity(parsed.name) && (!parsed.uf || city[1] === parsed.uf));
  return hit ? cityLabel(hit[0], hit[1]) : parsed.label;
}

export function parseServedCities(raw?: string | null): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map((item) => resolveCityLabel(String(item))).filter(Boolean))];
    }
  } catch {
    // csv
  }
  return [...new Set(text.split(",").map((item) => resolveCityLabel(item)).filter(Boolean))];
}

export function serializeServedCities(cities: string[]) {
  return JSON.stringify([...new Set(cities.map((item) => resolveCityLabel(item)).filter(Boolean))]);
}

export function supplierServesSalon(servedRaw: string | null | undefined, salonCity: string | null | undefined) {
  const salon = parseCityInput(salonCity);
  if (!salon.name) return false;
  return parseServedCities(servedRaw).some((item) => {
    const city = parseCityInput(item);
    if (!city.name) return false;
    if (salon.uf && city.uf && salon.uf !== city.uf) return false;
    return foldCity(salon.name) === foldCity(city.name);
  });
}

export function searchCities(query: string, limit = 40) {
  const q = foldCity(query);
  if (q.length < 2) return [];
  const starts: { value: string; label: string }[] = [];
  const contains: { value: string; label: string }[] = [];
  for (const [name, uf] of CITIES) {
    const folded = foldCity(name);
    const value = cityLabel(name, uf);
    if (folded.startsWith(q)) starts.push({ value, label: value });
    else if (folded.includes(q)) contains.push({ value, label: value });
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
