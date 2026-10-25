import { digitsOnly } from "@/lib/utils";

export function matchesClientSearch(
  client: {
    name: string;
    nickname?: string | null;
    phone?: string | null;
    landline?: string | null;
    email?: string | null;
    tags?: string | null;
    cpf?: string | null;
    rg?: string | null;
    city?: string | null;
  },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [client.name, client.nickname, client.email, client.tags, client.cpf, client.rg, client.city]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (text.includes(q)) return true;
  const digits = digitsOnly(q);
  if (digits.length >= 3) {
    const phones = digitsOnly(`${client.phone ?? ""}${client.landline ?? ""}`);
    if (phones.includes(digits)) return true;
  }
  return false;
}
